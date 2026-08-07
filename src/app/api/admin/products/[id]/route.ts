import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, slugify } from "@/lib/utils/api";
import { productSchema } from "@/lib/validations/product";

// GET single product
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") return apiError("Unauthorized", 403);

    const { id } = await params;
    const product = await db.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        specs: { orderBy: { sortOrder: "asc" } },
        inventory: true,
        category: true,
      },
    });

    if (!product) return apiError("Product not found", 404);
    return apiSuccess(product);
  } catch {
    return apiError("Internal server error", 500);
  }
}

// PATCH update product
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") return apiError("Unauthorized", 403);

    const { id } = await params;
    const body = await request.json();
    const validated = productSchema.partial().safeParse(body);
    if (!validated.success) return apiError(validated.error.issues[0].message, 400);

    const { stock, ...productData } = validated.data;
    if (productData.name && !productData.slug) {
      productData.slug = slugify(productData.name);
    }

    const product = await db.product.update({
      where: { id },
      data: {
        ...productData,
        ...(stock !== undefined && {
          inventory: {
            upsert: {
              create: { quantity: Number(stock), lowStockThreshold: 10 },
              update: { quantity: Number(stock) },
            },
          },
        }),
        images: {
          deleteMany: {}, // Delete all existing images
          create: productData.images?.map((img) => ({
            url: img.url,
            publicId: img.publicId ?? "cmi-batteries/products/default",
            isPrimary: img.isPrimary,
            sortOrder: img.sortOrder,
            altText: img.altText,
          })) || [],
        },
        specs: {
          deleteMany: {}, // Delete all existing specs
          create: productData.specs?.map((spec) => ({
            label: spec.label,
            value: spec.value,
            unit: spec.unit,
            sortOrder: spec.sortOrder,
          })) || [],
        },
      },
      include: {
        inventory: true,
      },
    });

    return apiSuccess(product);
  } catch {
    return apiError("Internal server error", 500);
  }
}

// DELETE product
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") return apiError("Unauthorized", 403);

    const { id } = await params;
    await db.product.delete({ where: { id } });
    return apiSuccess({ deleted: true });
  } catch {
    return apiError("Internal server error", 500);
  }
}

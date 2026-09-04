import { getProductStory } from "@/lib/stories/actions";
import { getProduct } from "@/lib/products/actions";
import { notFound } from "next/navigation";
import { StoryFormClient } from "@/components/products/story-form";

export default async function ProductStoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id);
  const story = await getProductStory(id);

  if (!product) {
    notFound();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Product Story</h1>
      <p className="mt-1 text-gray-500">
        Tell the story behind {product.title}
      </p>
      <div className="mt-8 max-w-2xl">
        <StoryFormClient productId={id} initial={story} />
      </div>
    </div>
  );
}
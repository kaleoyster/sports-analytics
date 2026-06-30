"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function TimelineRedirect() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/l/${slug}#timeline`);
  }, [slug, router]);

  return null;
}

"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function BracketRedirect() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/l/${slug}`);
  }, [slug, router]);

  return null;
}

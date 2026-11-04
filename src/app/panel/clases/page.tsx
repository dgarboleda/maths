"use client";

import { useFamily } from "@/components/family/FamilyProvider";
import { CustomLessonsEditor } from "@/components/custom-lessons/editor/CustomLessonsEditor";

export default function CustomLessonsPage() {
  const { parentId } = useFamily();
  return <CustomLessonsEditor parentId={parentId} />;
}

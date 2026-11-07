"use client";

import { useMemo } from "react";
import { useFamily } from "@/components/family/FamilyProvider";
import { CustomLessonsEditor } from "@/components/custom-lessons/editor/CustomLessonsEditor";

export default function CustomLessonsPage() {
  const { parentId, children } = useFamily();
  const students = useMemo(() => children.map((c) => ({ id: c.id, name: c.name })), [children]);
  return <CustomLessonsEditor parentId={parentId} students={students} />;
}

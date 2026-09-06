"use client";

import { useParams } from "next/navigation";
import { LevelEditorProvider } from "@/components/level/editor/LevelEditorProvider";
import { LevelEditorScreen } from "@/components/level/editor/LevelEditorScreen";

export default function LevelEditorPage() {
  const params = useParams<{ levelId: string }>();
  return (
    <LevelEditorProvider levelId={params.levelId}>
      <LevelEditorScreen />
    </LevelEditorProvider>
  );
}

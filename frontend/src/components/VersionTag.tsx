import { useTags } from "@/hooks/useTags";
import { Badge } from "./ui/badge";
import { useMemo } from "react";

export function VersionTag({ name }: { name: string }) {
  const { tagsListData } = useTags();

  const tag = useMemo(() => {
    return tagsListData?.find((tag) => tag.name == name);
  }, [tagsListData, name]);

  if (!tag) {
    return null;
  }

  return (
    <Badge
      className="text-sm text-base-100"
      style={{
        backgroundColor: tag?.color,
      }}
    >
      {name}
    </Badge>
  );
}

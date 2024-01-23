import { Project } from "@/types/Project";
import { webServerClient } from "../base";
import { useEffect } from "react";

export async function fetchPublicProjectList(): Promise<Array<Project>> {
  const response = await webServerClient.get("/explore/projects");

  return response.data;
}

import { Inter } from "next/font/google";
import { ProjectVerticalNavbar } from "@/components/navbar/ProjectVerticalNavbar";

export const metadata = {
  title: "Dashboard - PromptModel",
  description: "Scalable prompt management",
};

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full h-full">
      <ProjectVerticalNavbar />
      {children}
    </div>
  );
}

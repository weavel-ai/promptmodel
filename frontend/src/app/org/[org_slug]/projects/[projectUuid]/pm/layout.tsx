import { Inter } from "next/font/google";
import { PmProjectVerticalNavbar } from "@/components/navbar/PmProjectVerticalNavbar";

export const metadata = {
  title: "Dashboard - Promptmodel",
  description: "Scalable prompt management",
};

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full h-full">
      <PmProjectVerticalNavbar />
      {children}
    </div>
  );
}

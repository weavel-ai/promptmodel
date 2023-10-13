import { DevelopmentNavbar } from "@/components/navbar/DevelopmentNavbar";

export default function DevLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DevelopmentNavbar />
      {children}
    </>
  );
}

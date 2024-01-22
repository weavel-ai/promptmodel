export const metadata = {
  title: "Dashboard - Weavel",
  description: "Conversational data analysis for your team.",
};

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="w-full h-full">{children}</div>;
}

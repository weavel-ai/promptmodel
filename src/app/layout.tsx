import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import classNames from "classnames";
import { Providers } from "@/components/Providers";
import { ClerkProvider } from "@clerk/nextjs";
import { DeploymentNavbar } from "@/components/navbar/DeploymentNavbar";
import { ModalRoot } from "@/components/ModalPortal";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PromptModel",
  description: "Prompt versioning on the cloud",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorBackground: "#21243A",
          colorText: "#fff",
          colorPrimary: "#6f00ff",
          colorTextOnPrimaryBackground: "#fff",
          colorTextSecondary: "#f2f2f2",
          colorInputText: "#fff",
          colorAlphaShade: "#fff",
          colorInputBackground: "#161827",
          // colorInputBackground: "#1a1a1a",
        },
      }}
    >
      <html
        lang="en"
        className="w-screen h-screen bg-base-100"
        data-theme="dark"
      >
        <body
          className={classNames(
            inter.className,
            "w-full h-full flex flex-col justify-start items-center"
          )}
        >
          <Providers>
            <DeploymentNavbar />
            <div className="fixed top-[15%] left-[50%] flex place-items-center before:absolute before:h-[300px] before:w-[480px] before:-translate-x-1/2 before:rounded-full before:blur-2xl before:content-[''] after:absolute after:-z-20 after:h-[180px] after:w-[240px] after:translate-x-1/3 after:bg-gradient-conic after:blur-2xl after:content-[''] before:bg-gradient-to-br before:from-transparent before:to-blue-700 before:opacity-10 after:from-sky-900 after:via-[#0141ff] after:opacity-40 before:lg:h-[360px] -z-10"></div>
            {children}
            <ModalRoot />
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}

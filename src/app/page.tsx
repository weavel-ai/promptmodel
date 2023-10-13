"use client";

import classNames from "classnames";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useMediaQuery } from "react-responsive";
import { logEvent } from "@/services/amplitude";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { coldarkDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import Link from "next/link";

const SUMMARIZATION_PROMPT = `
SUMMARIZATION_PROMPT = """
You are required to generate title and summary using given content and follow the provided output format.
Content:
{content}
Output format:
[Title start]
...
[Title end]
[Summary start]
...
[Summary end]"""`;

const PROMPTMODEL_CODE = `
from promptmodel import Client, PromptModel
 
client = Client()
 
# You can simply fetch prompts
extract_keyword_prompts = PromptModel("extract_keyword").get_prompts()
 
# Or use powerful generation utils of PromptModel
@client.register
def test():
    response = PromptModel("choose_service").generate({})
    print(response)
`;

export default function Home() {
  const [isUploading, setIsUploading] = useState(false);
  const isMobile = useMediaQuery({ query: "(max-width: 768px)" });
  const params = useSearchParams();
  const containerRef = useRef<HTMLDivElement>(null);

  // Amplitude logging
  useEffect(() => {
    logEvent("page_view:home", {
      utm_source: params.get("utm_source"),
      utm_medium: params.get("utm_medium"),
      utm_campaign: params.get("utm_campaign"),
      utm_content: params.get("utm_content"),
      utm_term: params.get("utm_term"),
    });
  }, []);

  return (
    <main
      className="h-full w-full overflow-y-auto overflow-x-hidden flex flex-col justify-start items-center"
      ref={containerRef}
    >
      <div
        className={classNames(
          "flex flex-col items-center justify-start h-max w-full max-w-[100rem]"
        )}
      >
        <div
          className={classNames(
            "flex flex-col items-start justify-center pl-12",
            "h-screen max-w-screen w-full relative z-10"
          )}
        >
          <motion.h1
            className="text-5xl font-extrabold text-base-content backdrop-blur-md rounded-box"
            initial={{ opacity: 0, translateY: 40 }}
            viewport={{ once: true }}
            whileInView={{
              opacity: 1,
              translateY: 0,
            }}
          >
            Prompt versioning on the cloud
          </motion.h1>
          <motion.div
            className="flex flex-col gap-y-4 items-start my-10"
            initial={{ opacity: 0, translateY: 40 }}
            viewport={{ once: true }}
            whileInView={{
              opacity: 1,
              translateY: 0,
            }}
            transition={{ delay: 0.2 }}
          >
            <p className="text-2xl font-medium text-transparent bg-clip-text bg-gradient-to-b from-secondary-content/60 from-20% to-secondary-content/70 backdrop-blur-md rounded-box">
              Build
              <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-b from-base-content/50 to-base-content">
                &nbsp;chains & pipelines&nbsp;
              </span>
              with various prompt configurations.
            </p>
            <p className="text-2xl font-medium text-transparent bg-clip-text bg-gradient-to-b from-secondary-content/60 from-20% to-secondary-content/70 backdrop-blur-md rounded-box">
              Run tests, experiment and evaluate your prompts.
            </p>
            <p className="text-2xl font-medium text-transparent bg-clip-text bg-gradient-to-b from-secondary-content/60 from-20% to-secondary-content/70 backdrop-blur-md rounded-box">
              Setup once with our SDK and automate your prompt development.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            viewport={{ once: true }}
            whileInView={{
              opacity: 1,
              scale: 1,
              rotate: 0,
            }}
            transition={{ delay: 0.4, type: "spring", stiffness: 100 }}
          >
            <Link
              href="/signup"
              className={classNames(
                "btn bg-gradient-to-br from-violet-500 from-20% to-primary text-white h-16 rounded-lg w-56 normal-case text-xl",
                "transition-all hover:shadow-2xl shadow-secondary"
              )}
            >
              Start Building
            </Link>
          </motion.div>
          <div
            style={{ perspective: "1000px" }}
            className="overflow-visible absolute mt-20 right-12 -z-10"
          >
            {/* <motion.div
              initial={{ opacity: 0, rotateX: 80 }}
              viewport={{ once: true }}
              whileInView={{
                opacity: 1,
                rotateX: 0,
              }}
              transition={{ duration: 0.7 }}
            >
              <Image
                src="/illust2-removebg.png"
                alt="illust"
                draggable={false}
                width={600}
                height={400}
                style={{
                  transform: "rotateY(-20deg) rotateX(20deg)",
                  transformOrigin: "center",
                }}
              />
            </motion.div> */}
            <motion.div
              initial={{ opacity: 0, translateY: 60 }}
              viewport={{ once: true }}
              whileInView={{
                translateY: 0,
                opacity: 1,
                rotateX: 10,
                rotateY: -5,
                rotateZ: 3,
                transformOrigin: "center",
              }}
              transition={{ duration: 0.7 }}
            >
              <Image
                src="/image2-removebg.png"
                draggable={false}
                alt="experiments"
                width={700}
                height={540}
              />
            </motion.div>
          </div>
        </div>
        <div className="flex flex-col my-32 min-h-[36rem] z-10 items-end justify-start gap-y-4 pr-12 w-full h-fit relative">
          <motion.div
            className="px-2 mb-6"
            initial={{ opacity: 0, translateY: 40 }}
            viewport={{ once: true }}
            whileInView={{ opacity: 1, translateY: 0 }}
          >
            <h1 className="text-5xl font-extrabold text-base-content">
              Free your code from prompts
            </h1>
          </motion.div>
          <motion.div
            className="backdrop-blur-md rounded-box"
            viewport={{ once: true }}
            initial={{ opacity: 0, translateY: 40 }}
            whileInView={{
              opacity: 1,
              translateY: 0,
            }}
            transition={{ delay: 0.2, type: "false" }}
          >
            <h3 className="text-3xl font-medium text-transparent bg-clip-text bg-gradient-to-b from-secondary-content/60 from-20% to-secondary-content/70">
              Update prompts without changing your code.
            </h3>
          </motion.div>
          <SummarizationPromptCode />
          <PromptlabsCode />
        </div>
        <div className="flex flex-col my-32 min-h-[36rem] z-10 items-start justify-start gap-y-4 pl-12 w-full h-fit relative">
          <motion.div
            className="backdrop-blur-md rounded-box bg-base-100/60 px-2 mb-6"
            viewport={{ once: true }}
            initial={{ opacity: 0, translateY: 40 }}
            whileInView={{ opacity: 1, translateY: 0 }}
          >
            <h1 className="text-5xl font-extrabold text-base-content">
              Experiment. Evaluate. Publish.
            </h1>
          </motion.div>
          <motion.div
            className="backdrop-blur-md rounded-box bg-base-100/60"
            initial={{ opacity: 0, translateY: 40 }}
            viewport={{ once: true }}
            whileInView={{
              opacity: 1,
              translateY: 0,
            }}
            transition={{ delay: 0.2, type: "false" }}
          >
            <h3 className="text-3xl font-medium text-transparent bg-clip-text bg-gradient-to-b from-secondary-content/60 from-20% to-secondary-content/70">
              Scale your prompt development workflow.
            </h3>
          </motion.div>
          <motion.div
            className="backdrop-blur-md rounded-box bg-base-100/60"
            initial={{ opacity: 0, translateY: 40 }}
            viewport={{ once: true }}
            whileInView={{
              opacity: 1,
              translateY: 0,
            }}
            transition={{ delay: 0.2, type: "false" }}
          >
            <h3 className="text-2xl font-medium text-transparent bg-clip-text bg-gradient-to-b from-secondary-content/60 from-20% to-secondary-content/70">
              Run experiments and compare various prompt configurations.
            </h3>
          </motion.div>
          <motion.div
            className="backdrop-blur-md rounded-box bg-base-100/60"
            initial={{ opacity: 0, translateY: 40 }}
            viewport={{ once: true }}
            whileInView={{
              opacity: 1,
              translateY: 0,
            }}
            transition={{ delay: 0.2, type: "false" }}
          >
            <h3 className="text-2xl font-medium text-transparent bg-clip-text bg-gradient-to-b from-secondary-content/60 from-20% to-secondary-content/70">
              Publish the best configuration in a blink.
            </h3>
          </motion.div>
          <div
            style={{ perspective: "1000px" }}
            className="overflow-visible absolute right-12 top-20 -z-10"
          >
            <motion.div
              initial={{ opacity: 0, translateY: 60 }}
              viewport={{ once: true }}
              whileInView={{
                translateY: 0,
                opacity: 1,
                rotateX: 10,
                rotateY: -5,
                rotateZ: 3,
                transformOrigin: "center",
              }}
              transition={{ duration: 0.7 }}
            >
              <Image
                src="/fastmodel-versions.png"
                draggable={false}
                alt="experiments"
                width={700}
                height={540}
              />
            </motion.div>
          </div>
        </div>
      </div>
      <div
        className={classNames(
          "flex flex-col items-center justify-center pl-12",
          "min-h-[50vh] max-w-screen w-full relative z-10",
          "bg-base-200"
        )}
      >
        <motion.h1
          className="text-5xl font-extrabold text-base-content mb-10"
          initial={{ opacity: 0, translateY: 40 }}
          viewport={{ once: true }}
          whileInView={{
            opacity: 1,
            translateY: 0,
          }}
        >
          Start scaling your prompts now.
        </motion.h1>
        <motion.div
          initial={{ opacity: 0, translateY: 40 }}
          viewport={{ once: true }}
          whileInView={{
            opacity: 1,
            translateY: 0,
          }}
          transition={{ delay: 0.2, type: "false" }}
        >
          <h3 className="text-2xl font-medium text-transparent bg-clip-text bg-gradient-to-b from-secondary-content/60 from-20% to-secondary-content/70 mb-8">
            Join our growing community.
          </h3>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          viewport={{ once: true }}
          whileInView={{
            opacity: 1,
            scale: 1,
            rotate: 0,
          }}
          transition={{ delay: 0.4, type: "spring", stiffness: 100 }}
        >
          {/* <div className="mt-4 rounded-md px-6 py-3 bg-gradient-to-br from-primary to-primary/60"> */}
          <Link
            href="/signup"
            className={classNames(
              "mt-4 btn bg-gradient-to-br from-violet-500 from-20% to-primary text-white h-16 rounded-lg w-56 normal-case text-xl",
              "transition-all hover:shadow-2xl shadow-secondary"
            )}
          >
            Start Building
          </Link>
          {/* </div> */}
        </motion.div>
      </div>
    </main>
  );
}

const SummarizationPromptCode = () => {
  return (
    <div
      style={{ perspective: "1000px" }}
      className="overflow-visible absolute left-16 bottom-20 -z-10 scale-50 sm:scale-100"
    >
      <motion.div
        className="mockup-code bg-base-300/50  hover:shadow-2xl transition-shadow duration-300"
        initial={{ opacity: 0.5, rotateX: 40 }}
        viewport={{ once: true }}
        whileHover={{ translateY: -10 }}
        whileInView={{
          opacity: 1,
          rotateX: 5,
          rotateY: 15,
          rotateZ: -1,
          transformOrigin: "center",
        }}
        transition={{ duration: 0.7 }}
      >
        <SyntaxHighlighter language="python" style={coldarkDark}>
          {SUMMARIZATION_PROMPT}
        </SyntaxHighlighter>
      </motion.div>
    </div>
  );
};

const PromptlabsCode = () => {
  return (
    <div
      style={{ perspective: "1000px" }}
      className="overflow-visible absolute right-16 bottom-0 -z-10 scale-50 sm:scale-100"
    >
      <motion.div
        className="mockup-code bg-base-300/50 hover:shadow-2xl transition-shadow duration-300"
        initial={{ opacity: 0.5, rotateX: 40 }}
        viewport={{ once: true }}
        onViewportEnter={() => {}}
        whileHover={{ translateY: -10 }}
        whileInView={{
          opacity: 1,
          rotateX: 5,
          rotateY: -15,
          rotateZ: 3,
          transformOrigin: "center",
        }}
        transition={{ duration: 0.7 }}
      >
        <SyntaxHighlighter language="python" style={coldarkDark}>
          {PROMPTMODEL_CODE}
        </SyntaxHighlighter>
      </motion.div>
    </div>
  );
};

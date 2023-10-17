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
def summary():
    response = PromptModel("summary").generate({})
    return response
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
            "flex flex-col items-start",
            "h-screen max-w-screen w-full relative z-10",
            !isMobile && "pl-12 justify-center",
            isMobile && "px-4 pt-32"
          )}
        >
          <motion.h1
            className={classNames(
              !isMobile &&
                "text-5xl font-extrabold text-base-content backdrop-blur-md rounded-box",
              isMobile && "text-4xl font-bold text-base-content text-left"
            )}
            initial={{ opacity: 0, translateY: 40 }}
            viewport={{ once: true }}
            whileInView={{
              opacity: 1,
              translateY: 0,
            }}
          >
            Prompt versioning{isMobile ? <br /> : " "}on the cloud
          </motion.h1>
          <div
            style={{ perspective: "1000px" }}
            className={classNames(
              "overflow-visible ",
              isMobile && "",
              !isMobile && "absolute mt-20 right-12 -z-10"
            )}
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
                width={isMobile ? 400 : 700}
                height={isMobile ? 250 : 540}
                className={classNames(isMobile && "ms-4")}
              />
            </motion.div>
          </div>
          <motion.div
            className={classNames(
              "flex flex-col items-start my-10",
              isMobile && "gap-y-2",
              !isMobile && "gap-y-4"
            )}
            initial={{ opacity: 0, translateY: 40 }}
            viewport={{ once: true }}
            whileInView={{
              opacity: 1,
              translateY: 0,
            }}
            transition={{ delay: 0.2 }}
          >
            <p
              className={classNames(
                "text-transparent bg-clip-text bg-gradient-to-b from-secondary-content/60 from-20% to-secondary-content/70 backdrop-blur-md rounded-box",
                isMobile && "text-xl font-semibold p-1",
                !isMobile && "text-2xl font-medium"
              )}
            >
              Build
              <span className="font-bold text-transparent bg-clip-text bg-gradient-to-b from-base-content/50 to-base-content">
                &nbsp;chains & pipelines&nbsp;
              </span>
              with various prompt configurations.
            </p>
            <p
              className={classNames(
                "text-transparent bg-clip-text bg-gradient-to-b from-secondary-content/60 from-20% to-secondary-content/70 backdrop-blur-md rounded-box",
                isMobile && "text-xl font-semibold p-1",
                !isMobile && "text-2xl font-medium"
              )}
            >
              Run tests, experiment and evaluate your prompts.
            </p>
            <p
              className={classNames(
                "text-transparent bg-clip-text bg-gradient-to-b from-secondary-content/60 from-20% to-secondary-content/70 backdrop-blur-md rounded-box",
                isMobile && "text-xl font-semibold p-1",
                !isMobile && "text-2xl font-medium"
              )}
            >
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
        </div>
        <div
          className={classNames(
            "flex flex-col my-32 min-h-[36rem] z-10 gap-y-4 justify-start w-full h-fit relative",
            isMobile && "px-6 items-center",
            !isMobile && "items-end pr-12"
          )}
        >
          <motion.div
            className={classNames(
              isMobile && "self-end",
              !isMobile && "px-2 mb-6"
            )}
            initial={{ opacity: 0, translateY: 40 }}
            viewport={{ once: true }}
            whileInView={{ opacity: 1, translateY: 0 }}
          >
            <h1
              className={classNames(
                "text-base-content",
                isMobile && "text-4xl font-bold self-end text-end",
                !isMobile && "text-5xl font-extrabold"
              )}
            >
              Free your code{isMobile ? <br /> : " "}from prompts
            </h1>
          </motion.div>
          {!isMobile && <SummarizationPromptCode />}
          {
            <div className={classNames(isMobile && "h-fit")}>
              <PromptlabsCode isMobile={isMobile} />
            </div>
          }
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
            <h3
              className={classNames(
                "text-transparent bg-clip-text bg-gradient-to-b from-secondary-content/60 from-20% to-secondary-content/70",
                isMobile && "text-2xl font-medium text-right",
                !isMobile && "text-3xl font-medium"
              )}
            >
              Update prompts without changing your code.
            </h3>
          </motion.div>
        </div>
        <div
          className={classNames(
            "flex flex-col my-32 min-h-[36rem] z-10 items-start justify-start gap-y-4  w-full h-fit relative",
            isMobile && "px-4",
            !isMobile && "pl-12"
          )}
        >
          <motion.div
            className={classNames(
              "px-2",
              isMobile && "",
              !isMobile && "backdrop-blur-md rounded-box bg-base-100/60"
            )}
            viewport={{ once: true }}
            initial={{ opacity: 0, translateY: 40 }}
            whileInView={{ opacity: 1, translateY: 0 }}
          >
            <h1
              className={classNames(
                "text-base-content",
                isMobile && "text-4xl font-extrabold",
                !isMobile && "text-5xl font-extrabold"
              )}
            >
              Experiment. Evaluate.{isMobile ? <br /> : " "}Publish.
            </h1>
          </motion.div>
          <div
            style={{ perspective: "1000px" }}
            className={classNames(
              "overflow-visible ",
              isMobile && "ml-8 my-8",
              !isMobile && "absolute right-12 top-20 -z-10"
            )}
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
            <h3
              className={classNames(
                "text-transparent",
                "bg-clip-text bg-gradient-to-b from-secondary-content/60 from-20% to-secondary-content/70",
                isMobile && "text-xl font-bold ps-1",
                !isMobile && "text-3xl font-medium"
              )}
            >
              Scale your prompt{isMobile ? <br /> : " "}development workflow.
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
            <h3
              className={classNames(
                "text-transparent bg-clip-text bg-gradient-to-b from-secondary-content/60 from-20% to-secondary-content/70",
                isMobile && "text-xl font-bold ps-1",
                !isMobile && "text-2xl font-medium"
              )}
            >
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
            <h3
              className={classNames(
                "text-transparent bg-clip-text bg-gradient-to-b from-secondary-content/60 from-20% to-secondary-content/70",
                isMobile && "text-xl font-bold ps-1",
                !isMobile && "text-2xl font-medium"
              )}
            >
              Publish the best configuration{isMobile ? <br /> : " "}in a blink.
            </h3>
          </motion.div>
        </div>
      </div>
      <div
        className={classNames(
          "flex flex-col items-center justify-center",
          "max-w-screen w-full relative z-10",
          "bg-base-200",
          "text-center",
          isMobile && "min-h-[40vh]",
          !isMobile && "min-h-[50vh] pl-12"
        )}
      >
        <motion.h1
          className={classNames(
            "text-base-content",
            isMobile && "text-3xl font-extrabold mb-5",
            !isMobile && "text-5xl font-extrabold mb-10"
          )}
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
          <h3
            className={classNames(
              "font-medium text-transparent bg-clip-text bg-gradient-to-b from-secondary-content/60 from-20% to-secondary-content/70",
              isMobile && "text-xl mb-4",
              !isMobile && "text-2xl mb-8"
            )}
          >
            Join our closed beta.
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
              "mt-4 btn bg-gradient-to-br from-violet-500 from-20% to-primary text-white rounded-lg normal-case text-xl",
              "transition-all hover:shadow-2xl shadow-secondary",
              isMobile && "h-12 w-42",
              !isMobile && "h-16 w-56"
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

const PromptlabsCode = ({ isMobile }) => {
  return (
    <div
      style={{ perspective: "1000px" }}
      className={classNames(
        "overflow-visible ",
        isMobile && "scale-50",
        !isMobile && "absolute right-16 bottom-0 -z-10 scale-50 sm:scale-100"
      )}
    >
      <motion.div
        className="mockup-code bg-base-300/50 hover:shadow-2xl transition-shadow duration-300"
        initial={{ opacity: 0.5, rotateX: 40 }}
        viewport={{ once: true }}
        onViewportEnter={() => {}}
        whileHover={{ translateY: -10 }}
        whileInView={{
          opacity: 1,
          rotateX: isMobile ? 5 : 5,
          rotateY: isMobile ? 15 : -15,
          rotateZ: isMobile ? -1 : 3,
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

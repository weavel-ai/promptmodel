import { useEffect, useMemo, useState } from "react";
import { Modal } from "./Modal";
import { useCSVReader, formatFileSize } from "react-papaparse";
import classNames from "classnames";
import { Trash } from "@phosphor-icons/react";
import ReactJson from "react-json-view";
import { cloneDeep } from "@/utils";
import { string } from "zod";
import { useDatasetSampleInputs } from "@/hooks/useDatasetSampleInputs";
import { motion } from "framer-motion";
import Confetti from "react-confetti";

interface UploadCsvModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

enum Page {
  Upload,
  SelectHeader,
  MapColumns,
  Submit,
}
const pages = [
  { page: Page.Upload, component: UploadPage },
  { page: Page.SelectHeader, component: SelectHeaderPage },
  { page: Page.MapColumns, component: MapColumnsPage },
  { page: Page.Submit, component: SubmitPage },
];

export function UploadCsvModal({ isOpen, setIsOpen }: UploadCsvModalProps) {
  const [page, setPage] = useState<Page>(Page.Upload);
  const [uploadedData, setUploadedData] = useState<Array<any> | null>(null);
  const [headerRowIndex, setHeaderRowIndex] = useState<number | null>(null);
  const [headerRowData, setHeaderRowData] = useState<Array<any> | null>(null);
  const [inputKeyMappings, setInputKeyMappings] = useState<Record<
    string,
    string
  > | null>(null);
  const [groundTruthColumnIndex, setGroundTruthColumnIndex] = useState<
    number | null
  >(null);
  const [postCompletionRate, setPostCompletionRate] = useState<number>(0); // 0-1%
  const { postDatasetSampleInputsMutation, datasetSampleInputsCountQuery } =
    useDatasetSampleInputs();

  function reset() {
    setUploadedData(null);
    setHeaderRowIndex(null);
    setHeaderRowData(null);
    setInputKeyMappings(null);
    setGroundTruthColumnIndex(null);
    setPage(Page.Upload);
  }

  useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen]);

  // Find the component for the current page
  const CurrentPageComponent = useMemo(
    () => pages.find((p) => p.page === page)?.component,
    [page]
  );

  async function handleSubmit() {
    const sampleInputListDataWithoutHeader = uploadedData?.filter(
      (row, idx) => idx != headerRowIndex
    );
    const sampleInputListData = sampleInputListDataWithoutHeader?.map(
      (row, idx) => {
        const sampleInputContent: Record<string, any> = {};
        for (const key in inputKeyMappings) {
          const keyIndex = headerRowData?.findIndex((col) => col === key);
          sampleInputContent[inputKeyMappings[key]] = row[keyIndex];
        }
        const sampleInput = {
          input_keys: Object.keys(sampleInputContent),
          content: sampleInputContent,
        };
        if (!!groundTruthColumnIndex) {
          sampleInput["ground_truth"] = row[groundTruthColumnIndex];
        }

        return sampleInput;
      }
    );

    const batchSize = 50;

    // Split the data into batches
    const batches = [];
    for (let i = 0; i < sampleInputListData.length; i += batchSize) {
      const batch = sampleInputListData.slice(i, i + batchSize);
      batches.push(batch);
    }

    // Post each batch
    for (const batch of batches) {
      await postDatasetSampleInputsMutation.mutateAsync({
        body: batch,
      });
      setPostCompletionRate(
        // Update the progress bar
        (batches.indexOf(batch) + 1) / batches.length
      );
    }
    //  Wait 2 seconds before closing the modal
    setInterval(() => {
      setTimeout(() => {
        setIsOpen(false);
        datasetSampleInputsCountQuery.refetch();
      }, 2000);
    }, 1000);
  }

  return (
    <Modal
      isOpen={isOpen}
      setIsOpen={page == Page.Submit ? () => {} : setIsOpen}
    >
      <div className="bg-popover shadow-lg p-6 rounded-box flex flex-col gap-y-2 justify-start items-start min-w-[60vw] max-h-[95vh]">
        <CurrentPageComponent
          {...{
            uploadedData: uploadedData,
            setUploadedData: setUploadedData,
            headerRowIndex: headerRowIndex,
            setHeaderRowIndex: setHeaderRowIndex,
            headerRowData: headerRowData,
            setHeaderRowData: setHeaderRowData,
            inputKeyMappings: inputKeyMappings,
            setInputKeyMappings: setInputKeyMappings,
            groundTruthColumnIndex: groundTruthColumnIndex,
            setGroundTruthColumnIndex: setGroundTruthColumnIndex,
            postCompletionRate: postCompletionRate,
            setPostCompletionRate: setPostCompletionRate,
            handleSubmit: handleSubmit,
            setPage: setPage,
          }}
        />
      </div>
    </Modal>
  );
}

interface PageProps {
  uploadedData: Array<any> | null;
  setUploadedData: (data: Array<any> | null) => void;
  headerRowIndex?: number;
  setHeaderRowIndex?: (index: number) => void;
  headerRowData?: Array<any> | null;
  setHeaderRowData?: (data: Array<any> | null) => void;
  inputKeyMappings?: Record<string, string> | null;
  setInputKeyMappings?: (data: Record<string, string> | null) => void;
  groundTruthColumnIndex?: number | null;
  setGroundTruthColumnIndex?: (index: number | null) => void;
  postCompletionRate?: number;
  setPostCompletionRate?: (percentage: number) => void;
  handleSubmit?: () => void;
  setPage: (page: Page) => void;
}

function UploadPage({ uploadedData, setUploadedData, setPage }: PageProps) {
  const { CSVReader } = useCSVReader();

  return (
    <div className="flex flex-col gap-y-2 w-full h-full">
      <CSVReader
        maxFiles={1}
        onUploadAccepted={(results: any) => {
          setUploadedData(results?.data);
        }}
        onDragOver={(event: DragEvent) => {
          event.preventDefault();
        }}
        onDragLeave={(event: DragEvent) => {
          event.preventDefault();
        }}
      >
        {({
          getRootProps,
          acceptedFile,
          ProgressBar,
          getRemoveFileProps,
          Remove,
        }: any) => (
          <div
            {...getRootProps()}
            className={classNames(
              "border border-dashed border-muted-content p-8 w-full rounded-md flex justify-center items-center",
              "transition-all",
              !acceptedFile && "hover:bg-base-content/10 cursor-pointer"
            )}
            onClick={acceptedFile ? undefined : getRootProps().onClick}
          >
            {acceptedFile ? (
              <>
                <div
                  className={classNames(
                    "bg-base-200 rounded-lg w-fit p-2",
                    "flex flex-col justify-center items-center gap-y-1"
                  )}
                >
                  <span className="text-muted-content">
                    {formatFileSize(acceptedFile.size)}
                  </span>
                  <span>{acceptedFile.name}</span>
                  <div>
                    <ProgressBar />
                  </div>
                  <button
                    {...getRemoveFileProps()}
                    className="transition-all p-2 hover:bg-red-500/20 rounded-md group"
                  >
                    <Trash size={20} className="group-hover:text-red-500" />
                  </button>
                </div>
              </>
            ) : (
              "Drop CSV file here or click to upload"
            )}
          </div>
        )}
      </CSVReader>
      <div className="flex flex-row w-full justify-end">
        <button
          className={classNames(
            "flex flex-row gap-x-2 items-center btn btn-outline btn-sm normal-case font-normal h-10 bg-base-content hover:bg-base-content/80",
            "disabled:bg-neutral-content"
          )}
          onClick={() => setPage(Page.SelectHeader)}
          disabled={!uploadedData}
        >
          <p className="text-base-100">Next</p>
        </button>
      </div>
    </div>
  );
}

function SelectHeaderPage({
  uploadedData,
  headerRowIndex,
  setHeaderRowIndex,
  headerRowData,
  setHeaderRowData,
  setPage,
}: PageProps) {
  return (
    <div className="w-full h-full flex flex-col gap-y-2">
      <p className="text-sm text-muted-content">
        Select the row that contains the header.
      </p>
      <p className="text-sm font-medium text-muted-content my-1">Header row</p>
      {headerRowIndex != null ? (
        <table className="table">
          <tbody>
            <tr className="bg-base-content/20">
              {headerRowData?.map((col: any, j) => (
                <td key={j}>{col}</td>
              ))}
            </tr>
          </tbody>
        </table>
      ) : (
        <div className="flex flex-col gap-y-2 justify-center items-center w-full h-full">
          <p className="text-base-content/80">No header row selected</p>
        </div>
      )}
      <p className="text-sm font-medium text-muted-content my-1">
        Uploaded data
      </p>
      <div className="flex-grow max-h-[50vh] overflow-auto">
        <table className="table">
          <tbody>
            {uploadedData?.map((row: Array<any>, i) => (
              <tr
                key={i}
                className={classNames(
                  "hover cursor-pointer",
                  i === headerRowIndex && "bg-base-content/20"
                )}
                onClick={() => {
                  if (i === headerRowIndex) {
                    setHeaderRowIndex(null);
                    setHeaderRowData(null);
                  } else {
                    setHeaderRowIndex(i);
                    setHeaderRowData(row);
                  }
                }}
              >
                {row.map((col: any, j) => (
                  <td key={j}>{col}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-row w-full justify-end gap-x-2 mt-2">
        <button
          className={classNames(
            "flex flex-row gap-x-2 items-center btn btn-ghost btn-sm normal-case font-normal h-10 hover:bg-base-content/20",
            "disabled:bg-neutral-content"
          )}
          onClick={() => setPage(Page.Upload)}
        >
          <p className="text-base-content/80">Back</p>
        </button>
        <button
          className={classNames(
            "flex flex-row gap-x-2 items-center btn btn-outline btn-sm normal-case font-normal h-10 bg-base-content hover:bg-base-content/80",
            "disabled:bg-neutral-content"
          )}
          onClick={() => setPage(Page.MapColumns)}
          disabled={headerRowIndex == null}
        >
          <p className="text-base-100">Next</p>
        </button>
      </div>
    </div>
  );
}

function MapColumnsPage({
  headerRowData,
  inputKeyMappings,
  setInputKeyMappings,
  groundTruthColumnIndex,
  setGroundTruthColumnIndex,
  handleSubmit,
  setPage,
}: PageProps) {
  const [errorKeys, setErrorKeys] = useState<Array<string>>([]);

  const isValidInputKey = (inputKey) => {
    // Use a regular expression to check for valid input key format
    const validInputKeyRegex = /^[a-zA-Z0-9_]*$/;
    return validInputKeyRegex.test(inputKey);
  };

  const inputKeySchema = string()
    .refine((value) => !value.includes(" "), {
      message: "Input key cannot contain whitespace.",
    })
    .refine(isValidInputKey, {
      message:
        "Invalid input key format. Use letters, numbers, and underscores.",
    });

  const inputKeyMap = useMemo(() => {
    if (!inputKeyMappings) return {};
    const newInputKeyMap: Record<string, string> = cloneDeep(inputKeyMappings);
    // If a key's column inded is equal to the ground truth column, then return remove it
    for (const key in newInputKeyMap) {
      const keyIndex = headerRowData?.findIndex((col) => col === key);
      if (keyIndex === groundTruthColumnIndex) {
        delete newInputKeyMap[key];
      }
    }
    return Object.keys(newInputKeyMap).reduce((acc, key) => {
      acc[newInputKeyMap[key]] = `Example ${key}`;
      return acc;
    }, {});
  }, [inputKeyMappings, headerRowData, groundTruthColumnIndex]);

  function validateInputKey(errorCol: string, inputKey: string) {
    let newErrorCols: Array<string> = cloneDeep(errorKeys);
    if (!inputKeySchema.safeParse(inputKey).success) {
      if (newErrorCols.includes(errorCol)) return;
      newErrorCols.push(errorCol);
    } else {
      if (!newErrorCols.includes(errorCol)) return;
      newErrorCols = newErrorCols.filter((col) => col !== errorCol);
    }
    setErrorKeys(newErrorCols);
  }

  return (
    <div className="w-full h-full flex flex-col gap-y-2">
      <p className="text-sm text-muted-content">
        Map columns to input keys / ground truth.
      </p>
      <p className="text-sm font-medium text-muted-content my-1">Header row</p>
      <table className="table">
        <tbody>
          <tr className="bg-base-content/20">
            {headerRowData?.map((col: any, j) => (
              <td key={j}>{col}</td>
            ))}
          </tr>
        </tbody>
      </table>
      <div className="flex flex-row justify-start items-start gap-x-4">
        <div className="w-fit flex flex-col justify-start items-start gap-y-2">
          <p className="text-sm font-medium text-muted-content my-1">
            Example input
          </p>
          <ReactJson
            src={inputKeyMap}
            name={false}
            displayDataTypes={false}
            displayObjectSize={false}
            enableClipboard={false}
            theme="harmonic"
          />
        </div>
        <div className="flex flex-col justify-start items-start gap-y-2">
          <p className="text-sm font-medium text-muted-content my-1">
            Ground truth column
          </p>
          <select
            className="select select-bordered w-full max-w-xs"
            onChange={(e) => {
              const value = e.target.value;
              if (value === "") {
                setGroundTruthColumnIndex(null);
                return;
              }
              setGroundTruthColumnIndex(parseInt(value));
            }}
          >
            <option value={null}>None</option>
            {headerRowData?.map((col: any, j) => (
              <option key={j} value={j}>
                {col}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex-grow max-h-[50vh] overflow-auto my-2">
        <table className="table table-pin-rows">
          <thead>
            <tr className="text-base-content">
              <th>Column</th>
              <th>Input key name (Leave empty to ignore)</th>
            </tr>
          </thead>
          <tbody>
            {headerRowData?.map((col: any, j: number) => {
              if (j == groundTruthColumnIndex) {
                return null;
              }
              return (
                <tr key={j}>
                  <td>{col}</td>
                  <td className="flex flex-col gap-y-1 items-start">
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      value={inputKeyMappings?.[col]}
                      onChange={(e) => {
                        const inputKey = e.target.value;
                        if (inputKey?.length === 0) {
                          const newInputKeyMappings = { ...inputKeyMappings };
                          delete newInputKeyMappings[col];
                          setInputKeyMappings?.(newInputKeyMappings);
                          return;
                        }
                        const newInputKeyMappings = { ...inputKeyMappings };
                        newInputKeyMappings[col] = inputKey;
                        setInputKeyMappings?.(newInputKeyMappings);
                        validateInputKey(col, inputKey);
                      }}
                    />

                    {errorKeys.includes(col) && (
                      <p className="text-red-500 text-sm">
                        Invalid input key format. Use letters, numbers, and
                        underscores.
                      </p>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-row w-full justify-end gap-x-2 mt-2">
        <button
          className={classNames(
            "flex flex-row gap-x-2 items-center btn btn-ghost btn-sm normal-case font-normal h-10 hover:bg-base-content/20",
            "disabled:bg-neutral-content"
          )}
          onClick={() => setPage(Page.Upload)}
        >
          <p className="text-base-content/80">Back</p>
        </button>
        <button
          className={classNames(
            "flex flex-row gap-x-2 items-center btn btn-outline btn-sm normal-case font-normal h-10 bg-base-content hover:bg-base-content/80",
            "disabled:bg-neutral-content"
          )}
          onClick={() => {
            setPage(Page.Submit);
            handleSubmit?.();
          }}
          disabled={
            (!!inputKeyMappings &&
              Object.values(inputKeyMappings)?.every(
                (val) => !val || val?.length == 0
              )) ||
            errorKeys.length > 0
          }
        >
          <p className="text-base-100">Upload</p>
        </button>
      </div>
    </div>
  );
}

function SubmitPage({ postCompletionRate, setPage }: PageProps) {
  return (
    <div className="w-full h-full flex flex-col gap-y-2">
      {postCompletionRate < 1 ? (
        <p className="text-sm text-muted-content">Uploading data...</p>
      ) : (
        <>
          <Confetti
            recycle={false}
            width={window?.innerWidth}
            height={window?.innerHeight}
          />
          <p className="w-full text-center text-lg font-medium text-base-content mb-2">
            Upload complete! 🎉
          </p>
        </>
      )}
      <div className="w-full h-2 rounded-full bg-base-content/20">
        <motion.div
          className="h-full rounded-full bg-secondary"
          animate={{ width: `${postCompletionRate * 100}%` }}
          initial={{ width: "0%" }}
        />
      </div>
    </div>
  );
}

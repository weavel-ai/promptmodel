"use client";

import { deleteDataset } from "@/apis/sample_inputs/deleteDataset";
import { deleteSampleInput } from "@/apis/sample_inputs/deleteSampleInput";
import { updateSampleInput } from "@/apis/sample_inputs/updateSampleInput";
import { Drawer } from "@/components/Drawer";
import { ClickToConfirmDeleteButton } from "@/components/buttons/ClickToConfirmDeleteButton";
import { ClickToEditInput } from "@/components/inputs/ClickToEditInput";
import { AddSampleInputModal } from "@/components/modals/AddSampleInputModal";
import { UploadCsvModal } from "@/components/modals/UploadCsvModal";
import { Badge } from "@/components/ui/badge";
import { useAuthorization } from "@/hooks/auth/useAuthorization";
import {
  ROWS_PER_PAGE,
  useDatasetSampleInputs,
} from "@/hooks/useDatasetSampleInputs";
import { useFunctionModelDatasets } from "@/hooks/useFunctionModelDatasets";
import { useProject } from "@/hooks/useProject";
import {
  ReadDatasetSampleInputsCountResponse,
  SampleInput,
} from "@/types/SampleInput";
import {
  ArrowLeft,
  ArrowRight,
  FileArrowUp,
  Plus,
  XCircle,
} from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import classNames from "classnames";
import dayjs from "dayjs";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import ReactJson from "react-json-view";
import { toast } from "react-toastify";

export default function Page() {
  const pathname = usePathname();
  const { isAuthorizedForProject } = useAuthorization();
  const router = useRouter();
  const { findDataset, updateDatasetMutation, deleteDatasetMutation } =
    useFunctionModelDatasets();
  const {
    datasetUuid,
    datasetSampleInputsQuery,
    datasetSampleInputsCountQuery,
    page,
    setPage,
  } = useDatasetSampleInputs();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [isAddInputModalOpen, setIsAddInputModalOpen] =
    useState<boolean>(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isTableAtTop, setIsTableAtTop] = useState<boolean>(false);
  const [selectedSampleInput, setSelectedSampleInput] =
    useState<SampleInput | null>(null);
  const sampleInputDrawerRef = useRef<HTMLDivElement>(null);
  const [newDatasetName, setNewDatasetName] = useState<string | null>(null);
  const [newDatasetDescription, setNewDatasetDescription] = useState<
    string | null
  >(null);
  const newDatasetNameRef = useRef<string | null>(null);
  const newDatasetDescriptionRef = useRef<string | null>(null);

  useHotkeys(
    "esc",
    () => {
      if (selectedSampleInput != null) {
        setSelectedSampleInput(null);
      }
    },
    { preventDefault: true },
    [selectedSampleInput]
  );

  // Clicking outside the drawer should set SelectedDataset to null when drawer is open
  useEffect(() => {
    // Create listener
    function handleClickOutside(event: MouseEvent) {
      if (
        sampleInputDrawerRef.current &&
        !sampleInputDrawerRef.current.contains(event.target as Node) &&
        selectedSampleInput != null
      ) {
        setSelectedSampleInput(null);
      }
    }
    // Bind the event listener
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      // Unbind the event listener on clean up
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [selectedSampleInput]);

  const dataset = useMemo(() => {
    return findDataset(datasetUuid);
  }, [findDataset, datasetUuid]);

  useEffect(() => {
    setNewDatasetName(dataset?.dataset_name || null);
    setNewDatasetDescription(dataset?.dataset_description || null);
  }, [dataset]);

  useEffect(() => {
    const handleScroll = () => {
      const top = tableContainerRef?.current?.getBoundingClientRect()?.top;
      const scrollTop = scrollRef?.current?.scrollTop;

      if (top !== undefined && top < 48) {
        setIsTableAtTop(true);
        // Adjust the scroll position to maintain the top of the table at 48 px
        scrollRef?.current?.scrollTo({
          top: scrollTop + top - 48,
          behavior: "auto", // Use 'auto' to avoid smooth scrolling
        });
        // Disable scroll down, but allow scroll up
        scrollRef?.current?.addEventListener("wheel", (e) => {
          if (e.deltaY > 0) {
            e.preventDefault();
          }
        });
      } else if (top !== undefined && top == 48) {
        setIsTableAtTop(true);
      } else {
        setIsTableAtTop(false);
        // Enable scroll down
        scrollRef?.current?.removeEventListener("wheel", (e) => {
          if (e.deltaY > 0) {
            e.preventDefault();
          }
        });
      }
    };

    scrollRef?.current?.addEventListener("scroll", handleScroll);

    return () => {
      scrollRef?.current?.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    newDatasetNameRef.current = newDatasetName;
  }, [newDatasetName]);

  useEffect(() => {
    newDatasetDescriptionRef.current = newDatasetDescription;
  }, [newDatasetDescription]);

  async function handleUpdateDataset() {
    const data = {
      uuid: datasetUuid,
    };

    if (newDatasetNameRef.current != null) {
      data["name"] = newDatasetNameRef.current;
    }
    if (newDatasetDescriptionRef.current != null) {
      data["description"] = newDatasetDescriptionRef.current;
    }
    console.log(data);
    await updateDatasetMutation.mutateAsync(data);
  }

  async function handleDeleteDataset() {
    await deleteDatasetMutation.mutateAsync({
      dataset_uuid: datasetUuid,
    });
    toast.success("Dataset deleted");
    router.push(`${pathname?.slice(0, pathname?.indexOf("/datasets"))}`);
  }

  return (
    <div className="overflow-y-auto w-full h-full" ref={scrollRef}>
      <div className="flex flex-col gap-y-2 justify-start items-start w-full pt-16 pl-24 pr-6">
        <div className="breadcrumbs">
          <ul>
            <li>
              <Link
                href={`${pathname?.slice(0, pathname?.indexOf("/datasets"))}`}
              >
                Datasets
              </Link>
            </li>
            <li>
              <a>{dataset?.dataset_name}</a>
            </li>
          </ul>
        </div>
        <div className="flex flex-row justify-between items-start w-full gap-x-6">
          <div className="bg-base-300 rounded-md p-4 flex flex-row justify-start items-start gap-x-6">
            <div className="flex flex-col gap-y-2 justify-start items-start w-fit">
              <p className="text-sm text-muted-content">Name</p>
              {/* <p className="text-base-content">{dataset?.dataset_name}</p> */}
              <ClickToEditInput
                value={newDatasetName}
                setValue={setNewDatasetName}
                placeholder="Enter dataset name"
                onBlur={handleUpdateDataset}
              />
            </div>
            <div className="flex flex-col gap-y-2 justify-start items-start w-fit">
              <p className="text-sm text-muted-content">Description</p>
              <ClickToEditInput
                value={newDatasetDescription}
                setValue={setNewDatasetDescription}
                placeholder="Enter dataset description"
                onBlur={handleUpdateDataset}
              />
            </div>
            {/* Delete button */}
            <ClickToConfirmDeleteButton
              variant="outline"
              handleDelete={handleDeleteDataset}
              label="Delete dataset"
            />
          </div>
          <div className="flex flex-col items-end gap-y-2">
            <button
              className={classNames(
                "btn btn-outline btn-sm h-10 rounded-md flex flex-row gap-x-1 items-center text-base-content/90 hover:text-base-content",
                "normal-case font-normal hover:bg-base-content/10 border-muted-content/80"
              )}
              onClick={() => setIsAddInputModalOpen(true)}
            >
              <Plus size={20} weight="bold" />
              <p>Add data</p>
            </button>
            <button
              className={classNames(
                "btn btn-outline btn-sm h-10 rounded-md flex flex-row gap-x-1 items-center text-base-content/90 hover:text-base-content",
                "normal-case font-normal hover:bg-base-content/10 border-muted-content/80"
              )}
              onClick={() => {
                if (!isAuthorizedForProject) {
                  /**
                   * @todo: Authorize this based on author of the version
                   */
                  toast.error("You are not authorized to perform this action.");
                  return;
                }
                setIsUploadModalOpen(true);
              }}
            >
              <FileArrowUp size={20} weight="fill" />
              <p>Upload file</p>
            </button>
          </div>
        </div>
        <div
          // max height: 100vh - 3rem
          className={classNames(
            "w-full h-full",
            // If top of the tableContainerRef is < 3rem, set overflow-hidden. else, set overflow-y-auto
            isTableAtTop ? "overflow-y-auto" : "overflow-hidden"
          )}
          style={{
            height: "calc(100vh - 3rem)",
          }}
          ref={tableContainerRef}
        >
          <table className="w-full table table-pin-rows border-muted">
            <thead className="z-10 w-full rounded-md sticky top-0">
              <tr className="text-base-content">
                <th className="w-fit !bg-base-300 rounded-tl-md">
                  <p className="text-base font-medium ps-1">Content</p>
                </th>
                <th className="w-fit !bg-base-300">
                  <p className="text-base font-medium ps-1">Name</p>
                </th>
                <th className="w-fit !bg-base-300 rounded-tr-md">
                  <p className="text-base font-medium ps-1">Ground truth</p>
                </th>
              </tr>
            </thead>
            <tbody className="bg-base-200">
              {datasetSampleInputsQuery?.data?.length == 0 && (
                <tr className="align-top">
                  <td className="w-fit" colSpan={3}>
                    <p className="text-base-content font-medium ps-1">
                      No sample input
                    </p>
                  </td>
                </tr>
              )}
              {datasetSampleInputsQuery?.data?.map(
                (sampleInput: SampleInput, idx) => (
                  <tr
                    key={idx}
                    className={classNames(
                      "transition-all align-top hover:shadow-sm hover:bg-base-content/10"
                    )}
                    onClick={() => setSelectedSampleInput(sampleInput)}
                  >
                    <td className="align-top w-fit">
                      {sampleInput.content == null ? (
                        <p>None</p>
                      ) : (
                        <ReactJson
                          src={sampleInput.content as Record<string, any>}
                          name={false}
                          displayDataTypes={false}
                          displayObjectSize={false}
                          enableClipboard={false}
                          theme="harmonic"
                        />
                      )}
                    </td>
                    <td
                      className={classNames(
                        "w-fit",
                        idx == datasetSampleInputsQuery?.data?.length - 1 &&
                          "rounded-bl-md"
                      )}
                    >
                      <p className="text-base-content font-medium ps-1">
                        {sampleInput.name}
                      </p>
                    </td>
                    <td
                      className={classNames(
                        idx == datasetSampleInputsQuery?.data?.length - 1 &&
                          "align-top w-fit rounded-br-md"
                      )}
                    >
                      <p className="text-base-content font-medium ps-1">
                        {sampleInput.ground_truth || "None"}
                      </p>
                    </td>
                  </tr>
                )
              )}
              <tr className="sticky bottom-0">
                <td
                  className="w-full p-2 bg-base-200 rounded-b-md text-sm"
                  colSpan={3}
                >
                  <div className="flex flex-row justify-start items-center gap-x-2">
                    <button
                      className="btn btn-outline btn-xs"
                      onClick={() => {
                        if (page > 1) {
                          setPage(page - 1);
                        }
                      }}
                    >
                      <ArrowLeft size={20} />
                    </button>
                    <p>Page</p>
                    <input
                      type="number"
                      value={page}
                      onChange={(e) => setPage(parseInt(e.target.value))}
                      className="input bg-input input-xs w-[3rem] text-center flex-shrink focus:outline-none active:outline-none"
                    />
                    <p className="flex-shrink-0">
                      of{" "}
                      {Math.ceil(
                        datasetSampleInputsCountQuery?.data?.count /
                          ROWS_PER_PAGE
                      )}
                    </p>
                    <button
                      className="btn btn-outline btn-xs mr-2"
                      onClick={() => {
                        if (
                          page <
                          Math.ceil(
                            datasetSampleInputsCountQuery?.data?.count /
                              ROWS_PER_PAGE
                          )
                        ) {
                          setPage(page + 1);
                        }
                      }}
                    >
                      <ArrowRight size={20} />
                    </button>
                    {datasetSampleInputsQuery?.isLoading ? (
                      <div className="loading loading-spinner loading-sm" />
                    ) : (
                      <p className="font-normal">{ROWS_PER_PAGE} records</p>
                    )}
                    <div className="divider divider-horizontal" />
                    <p className="text-muted-content">
                      Total{" "}
                      {datasetSampleInputsCountQuery?.data?.count || " - "} rows
                    </p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <UploadCsvModal
        isOpen={isUploadModalOpen}
        setIsOpen={setIsUploadModalOpen}
      />
      <AddSampleInputModal
        isOpen={isAddInputModalOpen}
        setIsOpen={setIsAddInputModalOpen}
      />
      <div ref={sampleInputDrawerRef}>
        <SampleInputDrawer
          isOpen={selectedSampleInput != null}
          close={() => setSelectedSampleInput(null)}
          sampleInput={selectedSampleInput}
        />
      </div>
    </div>
  );
}

function SampleInputDrawer({
  sampleInput,
  isOpen,
  close,
}: {
  sampleInput: SampleInput;
  isOpen: boolean;
  close: () => void;
}) {
  const queryClient = useQueryClient();
  const { projectUuid } = useProject();
  const { datasetUuid, page, updateSampleInputMutation } =
    useDatasetSampleInputs();
  const [groundTruth, setGroundTruth] = useState<string | null>(
    sampleInput?.ground_truth
  );
  const groundTruthRef = useRef<string | null>(null);

  useEffect(() => {
    groundTruthRef.current = groundTruth;
  }, [groundTruth]);

  useEffect(() => {
    setGroundTruth(sampleInput?.ground_truth);
  }, [sampleInput]);

  async function handleDelete() {
    await deleteSampleInput({
      sample_input_uuid: sampleInput?.uuid,
    });
    const previousData = queryClient.getQueryData<Array<SampleInput>>([
      "datasetSampleInputListData",
      {
        projectUuid: projectUuid,
        datasetUuid: datasetUuid,
        page: page,
      },
    ]);
    const newData = previousData?.filter((si) => si.uuid !== sampleInput?.uuid);
    queryClient.setQueryData<Array<SampleInput>>(
      [
        "datasetSampleInputListData",
        {
          projectUuid: projectUuid,
          datasetUuid: datasetUuid,
          page: page,
        },
      ],
      newData || [] // If newData is undefined, set it to an empty array
    );
    queryClient.setQueryData<ReadDatasetSampleInputsCountResponse>(
      [
        "datasetSampleInputsCount",
        {
          projectUuid: projectUuid,
          datasetUuid: datasetUuid,
        },
      ],
      (countData) => {
        return {
          dataset_uuid: datasetUuid,
          count: countData?.count ? countData.count - 1 : 0,
        };
      }
    );
    toast.success("Sample input deleted");
    close();
  }

  async function handleSaveGroundTruth() {
    await updateSampleInputMutation.mutateAsync({
      uuid: sampleInput?.uuid,
      name: sampleInput?.name,
      content: sampleInput?.content,
      ground_truth: groundTruthRef.current,
    });
  }

  return (
    <Drawer
      fullHeight
      open={isOpen}
      direction="right"
      classNames={classNames("!w-[50vw]")}
    >
      {isOpen && (
        <div
          className={classNames(
            "w-full h-full bg-popover/80 backdrop-blur-sm p-4 flex flex-col gap-y-2 justify-start items-start shadow-xl"
          )}
        >
          <button
            className="flex flex-row gap-x-2 items-center btn btn-sm normal-case font-normal bg-transparent border-transparent h-10 hover:bg-neutral-content/20"
            onClick={() => {
              close();
            }}
          >
            <XCircle size={24} />
            <p className="text-base-content text-sm">Esc</p>
          </button>
          <div className="flex flex-col gap-y-2 my-2 w-full">
            <p className="text-muted-content font-semibold">Created at</p>
            <p className="text-base-content">
              {dayjs(sampleInput?.created_at).format("DD MMM YYYY HH:mm:ss")}
            </p>
          </div>{" "}
          <div className="flex flex-col gap-y-2 my-2 w-full">
            <p className="text-muted-content font-semibold">Content</p>
            <ReactJson
              src={sampleInput?.content as Record<string, any>}
              name={false}
              displayDataTypes={false}
              displayObjectSize={false}
              enableClipboard={false}
              theme="harmonic"
            />
          </div>
          <div className="flex flex-col gap-y-2 my-2 w-full">
            <p className="text-muted-content font-semibold">Ground truth</p>
            <ClickToEditInput
              value={groundTruth}
              setValue={setGroundTruth}
              placeholder="Enter ground truth"
              onBlur={handleSaveGroundTruth}
              textarea
            />
          </div>
          <div className="flex flex-col gap-y-2 my-2">
            <p className="text-muted-content font-semibold">
              Delete sample input
            </p>
            <p></p>
            <ClickToConfirmDeleteButton
              handleDelete={handleDelete}
              label="Delete"
            />
          </div>
        </div>
      )}
    </Drawer>
  );
}

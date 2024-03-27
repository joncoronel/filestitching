"use client";

import { Slider } from "@nextui-org/slider";
import { useState, useMemo, useRef } from "react";
import { Select, SelectItem } from "@nextui-org/select";
import { Progress } from "@nextui-org/progress";

import { useAutoAnimate } from "@formkit/auto-animate/react";

import ReactPlayer from "react-player";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

const crfValues = [
  { id: 1, name: "High", value: "28" },
  { id: 2, name: "Medium", value: "30" },
  { id: 3, name: "Low", value: "32" },
];

const resolutions = [
  { id: 4, name: "360p (640x360)", value: "640x360" },
  { id: 3, name: "480p (854x480)", value: "854x480" },
  { id: 2, name: "720p (1280x720)", value: "1280x720" },
  { id: 1, name: "1080p (1920x1080)", value: "1920x1080" },
  { id: 5, name: "1440p (2560x1440)", value: "2560x1440" },
  { id: 0, name: "4K (3840x2160)", value: "3840x2160" },
];

const createURL = (file) => {
  if (!file) return null;
  const url = URL.createObjectURL(file);
  return url;
};

export default function Editor() {
  const [resolution, setResolution] = useState(resolutions[2].value);
  const [crfValue, setCRFValue] = useState(crfValues[2].value);

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ percentage: 0, timeLeft: 0 });

  const [videoReady, setVideoReady] = useState(false);
  const playerRef = useRef(null);
  const [baseFile, setBaseFile] = useState(null);

  const [sliderValue, setSliderValue] = useState(0);
  const [parent, enableAnimations] = useAutoAnimate(/* optional config */);

  const [compressedVideo, setCompressedVideo] = useState(null);

  const baseVideo = useMemo(() => {
    if (!baseFile) return null;
    const url = URL.createObjectURL(baseFile);

    return url;
  }, [baseFile]);

  const handleScrubbing = (value, player) => {
    const duration = player.current.getDuration();
    const newTime = (value / 100) * duration;
    player.current.seekTo(newTime, "seconds");
    setSliderValue((newTime / duration) * 100);
  };

  const convertTime = (value, player) => {
    const duration = player.current.getDuration();
    const newTime = (value / 100) * duration;
    const minutes = Math.floor(newTime / 60);
    const seconds = Math.floor(newTime % 60);
    const milliseconds = Math.floor((newTime % 1) * 100)
      .toString()
      .padStart(2, "0");
    return `${minutes}:${seconds}:${milliseconds}`;
  };

  const handleCompression = async () => {
    setCompressedVideo(null);
    let startTime = Date.now();
    if (!baseFile) {
      console.error("Base file is required for compression");
      return;
    }
    setLoading(true);
    const ffmpeg = new FFmpeg();
    ffmpeg.on("progress", ({ progress, time }) => {
      const percentage = Math.round(progress * 100);

      const currentTime = Date.now();
      const difference = currentTime - startTime;
      const timeLeft = (difference / progress - difference) / 1000;

      const timeLeftString =
        timeLeft > 3600
          ? `${Math.floor(timeLeft / 3600)}h`
          : timeLeft > 60
            ? `${Math.floor(timeLeft / 60)}m`
            : `${Math.floor(timeLeft)}s`;

      setProgress({ percentage, timeLeft: timeLeftString });
    });

    await ffmpeg.load();

    await ffmpeg.writeFile("base.mp4", await fetchFile(createURL(baseFile)));

    const command = [
      "-i",
      "base.mp4",
      "-vcodec",
      "libx264",
      "-crf",
      crfValue,
      "-preset",
      "ultrafast",
      "-s",
      resolution,
      "compressed.mp4",
    ];

    await ffmpeg.exec(command);

    const data = await ffmpeg.readFile("compressed.mp4");

    const url = URL.createObjectURL(
      new Blob([data.buffer], { type: "video/mp4" }),
    );

    setCompressedVideo(url);
    setLoading(false);
  };

  return (
    <main className="dark flex min-h-screen flex-col items-center justify-between p-4">
      <div
        ref={parent}
        className="flex w-full max-w-3xl flex-col items-center justify-center gap-8"
      >
        <h1 className="text-4xl font-bold">Upload your files</h1>
        <div className="flex flex-col items-center justify-center space-y-4">
          <label className="text-lg font-semibold text-gray-700">
            Base File
          </label>
          <input
            type="file"
            onChange={(e) => {
              setBaseFile(e.target.files[0] || null);
              setVideoReady(false);
              setSliderValue(0);
            }}
            className="file:text-foreground file:bg-primary hover:file:bg-primary-300 
               cursor-pointer file:mr-4 
               file:cursor-pointer file:rounded-full 
               file:border-0 file:px-4 
               file:py-2 file:text-sm file:font-semibold"
          />
        </div>
        {baseVideo && (
          <>
            <ReactPlayer
              ref={playerRef}
              url={baseVideo}
              onReady={() => {
                setVideoReady(true);
              }}
              className=" !h-auto !w-full max-w-full overflow-clip rounded-md"
            />
            <Slider
              isDisabled={!playerRef.current || !videoReady}
              label="TimeStamp"
              value={sliderValue}
              onChange={(value) => {
                handleScrubbing(value, playerRef);
              }}
              getValue={(value) => {
                if (!playerRef.current || !videoReady) return "0:0:00";
                const newValue = convertTime(value, playerRef);
                return newValue;
              }}
              className="max-w-full"
            />
          </>
        )}

        <Select
          label="Quality"
          placeholder="Select a CRF value"
          className="max-w-xs"
          selectedKeys={[crfValue]}
          onChange={(e) => setCRFValue(e.target.value)}
        >
          {crfValues.map((crf) => (
            <SelectItem key={crf.value} value={crf.value}>
              {crf.name}
            </SelectItem>
          ))}
        </Select>

        <Select
          label="Resolution"
          placeholder="Select a resolution"
          className="max-w-xs"
          selectedKeys={[resolution]}
          onChange={(e) => setResolution(e.target.value)}
        >
          {resolutions.map((resolution) => (
            <SelectItem key={resolution.value} value={resolution.value}>
              {resolution.name}
            </SelectItem>
          ))}
        </Select>

        <button
          onClick={() => {
            handleCompression();
          }}
          className="bg-primary text-foreground hover:bg-primary-300 rounded-full px-4 py-2 font-semibold"
        >
          Compress Video
        </button>

        {loading && (
          <Progress
            aria-label="Compressing..."
            size="md"
            label={`Time until finished compressing: ${progress.timeLeft || "0s"}`}
            value={progress.percentage}
            color="success"
            showValueLabel={true}
            className="max-w-md"
          />
        )}

        {compressedVideo && (
          <>
            <ReactPlayer
              url={compressedVideo}
              controls
              className=" !h-auto !w-full max-w-full overflow-clip rounded-md"
            />

            <a href={compressedVideo} download="compressed.mp4">
              <button className="bg-primary text-foreground hover:bg-primary-300 rounded-full px-4 py-2 font-semibold">
                Download Compressed Video
              </button>
            </a>
          </>
        )}
      </div>
    </main>
  );
}

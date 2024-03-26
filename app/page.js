"use client";

import { Slider } from "@nextui-org/slider";
import { useState, useMemo, useRef } from "react";

import { useAutoAnimate } from "@formkit/auto-animate/react";

import ReactPlayer from "react-player";

const createURL = (file) => {
  if (!file) return null;
  const url = URL.createObjectURL(file);
  return url;
};

export default function Home() {
  const [videoReady, setVideoReady] = useState(false);
  const playerRef = useRef(null);
  const [baseFile, setBaseFile] = useState(null);
  const [targetFile, setTargetFile] = useState(null);
  const [sliderValue, setSliderValue] = useState(0);
  const [parent, enableAnimations] = useAutoAnimate(/* optional config */);

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

  return (
    <main className="dark flex min-h-screen flex-col items-center justify-between p-4">
      <div
        ref={parent}
        className="flex w-full max-w-3xl flex-col items-center justify-center gap-8"
      >
        <h1 className="text-4xl font-bold">Upload your files</h1>
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
      </div>
    </main>
  );
}

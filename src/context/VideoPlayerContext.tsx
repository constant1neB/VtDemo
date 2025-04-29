import React, { createContext, useState, ReactNode, useCallback, useContext, useMemo } from 'react';
import { VideoResponse } from '../types';

interface VideoPlayerContextType {
    uploadedVideoMeta: VideoResponse | null;
    videoUrl: string | null;
    currentFile: File | null;
    setPlayerVideo: (meta: VideoResponse | null, file?: File | null) => void;
    clearPlayerVideo: () => void;
}

const VideoPlayerContext = createContext<VideoPlayerContextType | undefined>(undefined);

export const VideoPlayerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [uploadedVideoMeta, setUploadedVideoMeta] = useState<VideoResponse | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [currentFile, setCurrentFile] = useState<File | null>(null);

    const setPlayerVideo = useCallback((meta: VideoResponse | null, file: File | null = null) => {
        if (videoUrl) {
            URL.revokeObjectURL(videoUrl);
            console.debug("Revoked previous video object URL in context setter");
        }

        if (meta && file) {
            const newUrl = URL.createObjectURL(file);
            setUploadedVideoMeta(meta);
            setCurrentFile(file);
            setVideoUrl(newUrl); // Set new URL
            console.debug("Context: Set meta, stored file, created new Blob URL");
        } else if (meta && currentFile) {
            setUploadedVideoMeta(meta);
            if (!videoUrl) {
                const recreatedUrl = URL.createObjectURL(currentFile);
                setVideoUrl(recreatedUrl);
                console.debug("Context: Updated meta, recreated Blob URL from stored file");
            } else {
                console.debug("Context: Updated meta, kept existing Blob URL and file");
            }
        } else if (meta && !currentFile) {
            setUploadedVideoMeta(meta);
            setCurrentFile(null);
            setVideoUrl(null); // Can't create URL
            console.warn("Context: Updated meta, but no file available for Blob URL");
        } else {
            setUploadedVideoMeta(null);
            setCurrentFile(null);
            setVideoUrl(null);
            console.debug("Context: Cleared video meta, file, and Blob URL");
        }
    }, [videoUrl, currentFile]);

    const clearPlayerVideo = useCallback(() => {
        setPlayerVideo(null, null);
    }, [setPlayerVideo]);

    const value = useMemo(() => ({
        uploadedVideoMeta,
        videoUrl,
        currentFile,
        setPlayerVideo,
        clearPlayerVideo
    }), [uploadedVideoMeta, videoUrl, currentFile, setPlayerVideo, clearPlayerVideo]); // Remove dependency

    return (
        <VideoPlayerContext.Provider value={value}>
            {children}
        </VideoPlayerContext.Provider>
    );
};

export const useVideoPlayer = (): VideoPlayerContextType => {
    const context = useContext(VideoPlayerContext);
    if (context === undefined) {
        throw new Error('useVideoPlayer must be used within a VideoPlayerProvider');
    }
    return context;
};
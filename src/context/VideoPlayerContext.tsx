import React, { createContext, useState, ReactNode, useCallback, useContext, useMemo } from 'react';
import { VideoResponse } from '../types';

interface VideoPlayerContextType {
    uploadedVideoMeta: VideoResponse | null;
    currentFile: File | null;
    setPlayerVideo: (meta: VideoResponse | null, file?: File | null) => void;
    clearPlayerVideo: () => void;
}

const VideoPlayerContext = createContext<VideoPlayerContextType | undefined>(undefined);

export const VideoPlayerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [uploadedVideoMeta, setUploadedVideoMeta] = useState<VideoResponse | null>(null);
    const [currentFile, setCurrentFile] = useState<File | null>(null); // Store the File object

    const setPlayerVideo = useCallback((meta: VideoResponse | null, file: File | null = null) => {

        if (meta && file) {
            setUploadedVideoMeta(meta);
            setCurrentFile(file);
            console.debug("Context: Set meta and stored new file");
        } else if (meta && currentFile) {
            setUploadedVideoMeta(meta);
            console.debug("Context: Updated meta, kept existing file");
        } else if (meta && !currentFile) {
            setUploadedVideoMeta(meta);
            setCurrentFile(null);
            console.warn("Context: Updated meta, but no file available");
        } else {
            setUploadedVideoMeta(null);
            setCurrentFile(null);
            console.debug("Context: Cleared video meta and file");
        }
    }, [currentFile]);

    const clearPlayerVideo = useCallback(() => {
        setPlayerVideo(null, null);
    }, [setPlayerVideo]);

    const value = useMemo(() => ({
        uploadedVideoMeta,
        currentFile,
        setPlayerVideo,
        clearPlayerVideo
    }), [uploadedVideoMeta, currentFile, setPlayerVideo, clearPlayerVideo]);

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
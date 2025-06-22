// src/components/Chat/MessageContent.tsx
'use client';

import React from 'react';

interface MessageContentProps {
  text: string;
  isUser: boolean;
}

const MessageContent: React.FC<MessageContentProps> = ({ text, isUser }) => {
  // Function to detect if a URL is an image
  const isImageUrl = (url: string): boolean => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
    // Clean the URL by removing any trailing punctuation and query parameters
    const cleanUrl = url.split('?')[0].replace(/[).,;!]+$/, '').toLowerCase();
    const isImage = imageExtensions.some(ext => cleanUrl.endsWith(ext));
    // console.log('Checking if image URL:', url, 'Clean URL:', cleanUrl, 'Result:', isImage);
    return isImage;
  };

  // Function to detect if a URL is a video
  const isVideoUrl = (url: string): boolean => {
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'];
    // Clean the URL by removing any trailing punctuation and query parameters
    const cleanUrl = url.split('?')[0].replace(/[).,;!]+$/, '').toLowerCase();
    const isVideo = videoExtensions.some(ext => cleanUrl.endsWith(ext));
    // console.log('Checking if video URL:', url, 'Clean URL:', cleanUrl, 'Result:', isVideo);
    return isVideo;
  };

  // Function to extract URLs from text
  const extractUrls = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s)]+)/g; // Stop at ) or whitespace
    const foundUrls = text.match(urlRegex) || [];
    
    // Also extract URLs from Markdown image syntax ![alt](url)
    const markdownImageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let markdownMatch;
    while ((markdownMatch = markdownImageRegex.exec(text)) !== null) {
      if (markdownMatch[2] && markdownMatch[2].trim()) {
        foundUrls.push(markdownMatch[2].trim());
      }
    }
    
    // Remove duplicates by converting to Set and back to array
    const uniqueUrls = [...new Set(foundUrls)];
    
    console.log('Extracted URLs from text:', foundUrls, '→ Unique:', uniqueUrls);
    return uniqueUrls;
  };

  const urls = extractUrls(text);
  
  // Split text while preserving both URLs and Markdown image syntax
  const combinedRegex = /(https?:\/\/[^\s)]+|!\[([^\]]*)\]\(([^)]*)\))/g;
  const textParts = text.split(combinedRegex).filter(part => part !== undefined);
  
  // console.log('MessageContent rendering:', { text, urls, textParts });

  // Check if we have any non-media text to display
  const hasNonMediaText = textParts.some(part => {
    if (part.match(/https?:\/\/[^\s)]+/)) {
      return !isImageUrl(part) && !isVideoUrl(part);
    }
    // Hide empty Markdown image syntax like ![Screenshot]()
    if (part.match(/!\[([^\]]*)\]\(\s*\)/)) {
      return false;
    }
    // Hide Markdown image syntax with valid URLs
    if (part.match(/!\[([^\]]*)\]\(([^)]+)\)/)) {
      return false;
    }
    return part.trim().length > 0;
  });

  return (
    <div className="space-y-2">
      {/* Text content with proper word wrapping - only show if there's non-media text */}
      {hasNonMediaText && (
        <div className="break-words whitespace-pre-wrap">
          {textParts.map((part, index) => {
            if (part.match(/https?:\/\/[^\s)]+/)) {
              // Check if this URL will be rendered as media - if so, hide the text link
              const isMediaUrl = isImageUrl(part) || isVideoUrl(part);
              if (isMediaUrl) {
                // Return nothing for media URLs to hide them from text
                return null;
              }
              
              return (
                <a
                  key={index}
                  href={part}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`underline hover:no-underline ${
                    isUser ? 'text-blue-200' : 'text-green-200'
                  }`}
                >
                  {part}
                </a>
              );
            }
            
            // Hide empty Markdown image syntax like ![Screenshot]()
            if (part.match(/!\[([^\]]*)\]\(\s*\)/)) {
              return null;
            }
            
            // Hide Markdown image syntax with valid URLs (they'll be rendered as media below)
            if (part.match(/!\[([^\]]*)\]\(([^)]+)\)/)) {
              return null;
            }
            
            return <span key={index}>{part}</span>;
          })}
        </div>
      )}

      {/* Media content */}
      {urls.map((url, index) => {
        // Clean the URL for media rendering
        const cleanUrl = url.split('?')[0].replace(/[).,;!]+$/, '');
        
        if (isImageUrl(url)) {
          return (
            <div key={`img-${index}`} className="mt-2">
              <img
                src={cleanUrl}
                alt="Shared image"
                className="max-w-full h-auto rounded-lg border border-gray-600 shadow-lg cursor-pointer hover:opacity-90 transition-opacity"
                style={{ maxHeight: '300px', maxWidth: '100%' }}
                onClick={() => window.open(cleanUrl, '_blank')}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  // console.error('Failed to load image:', cleanUrl);
                }}
                onLoad={() => {
                  // console.log('Successfully loaded image:', cleanUrl);
                }}
              />
              <div className="text-xs text-gray-400 mt-1 opacity-70">
                Click to view full size
              </div>
            </div>
          );
        }

        if (isVideoUrl(url)) {
          return (
            <div key={`video-${index}`} className="mt-2">
              <video
                controls
                className="max-w-full h-auto rounded-lg border border-gray-600 shadow-lg"
                style={{ maxHeight: '300px', maxWidth: '100%' }}
              >
                <source src={cleanUrl} type="video/mp4" />
                <source src={cleanUrl} type="video/webm" />
                <source src={cleanUrl} type="video/ogg" />
                Your browser does not support the video tag.
              </video>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
};

export default MessageContent;
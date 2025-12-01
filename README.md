# HoopsLabeler - Basketball Video Annotation Tool

A lightweight, privacy-focused web application for annotating basketball shots in video footage. Designed for data collection, it runs entirely in the browser using the File System Access API, allowing for direct reading of videos and writing of annotation files to your local disk without backend servers.

![App Screenshot](https://i.imgur.com/your-screenshot-placeholder.png)

## ✨ Key Features

*   **Local File System Access**: Read videos and write annotations directly to your hard drive. No uploads required.
*   **Frame-by-Frame Navigation**: Precise control with keyboard shortcuts (Arrow keys) and custom FPS settings.
*   **Rapid Annotation**: Shortcuts (`1` for In, `2` for Out) instantly save the current frame as a JPEG and create a corresponding label text file.
*   **Playlist Management**: Automatically scans the selected source folder for all supported video files.
*   **Review & Edit**: Click on saved files in the sidebar to review the image and correct the label if necessary.
*   **Privacy First**: No data ever leaves your computer.

## 🛠 Tech Stack

*   **React 18** (Vite)
*   **TypeScript**
*   **Tailwind CSS**
*   **File System Access API**
*   **Lucide React** (Icons)

## 🚀 Installation & Local Development

To run this project locally, you need Node.js installed.

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/hoops-labeler.git
    cd hoops-labeler
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Start the development server**
    ```bash
    npm run dev
    ```

4.  **Open in Browser**
    Open the link shown in the terminal (usually `http://localhost:5173`).

    > **Note:** Use Chrome, Edge, or Opera. Firefox and Safari have limited or no support for the File System Access API needed for this tool.

## 📖 Usage Guide

1.  **Select Folders**:
    *   Click **"Select Video Folder"** to choose the directory containing your game footage (`.mp4`, `.mov`, etc.).
    *   Click **"Select Save Folder"** to choose where the images (`.jpg`) and labels (`.txt`) will be saved.

2.  **Navigation**:
    *   **Spacebar**: Play / Pause.
    *   **Left / Right Arrow**: Step backward or forward by 1 frame (based on the FPS setting).
    *   **FPS Input**: Adjust the frame rate if your video is not 30fps (affects step size).

3.  **Annotation**:
    *   When you see a shot outcome, press:
        *   **`1`**: To label **Ball In** (Scored).
        *   **`2`**: To label **Ball Out** (Missed).
    *   The tool will freeze the video, capture the frame, save it to your folder, and show a confirmation toast.

4.  **Reviewing**:
    *   Saved files appear in the right sidebar.
    *   Click any file to open the **Edit Modal**, where you can change the label if you made a mistake.

## ⚠️ Browser Compatibility

This application relies heavily on the **Window.showDirectoryPicker()** API.

| Browser | Status |
| :--- | :--- |
| **Chrome / Chromium** | ✅ Fully Supported |
| **Edge** | ✅ Fully Supported |
| **Opera** | ✅ Fully Supported |
| **Firefox** | ❌ Not Supported |
| **Safari** | ❌ Not Supported |
| **Mobile Browsers** | ❌ Not Supported |

## 📄 License

MIT License. Free to use for personal or commercial projects.

import {type ChangeEvent, useEffect, useRef, useState} from "react";
import {FileAudio, FileIcon, FileImage, FileText, FileVideo, Plus, Trash2, Upload, X} from 'lucide-react';
import axios from "axios";
import CreatableSelect from "react-select/creatable";
import {components, type OptionProps, type StylesConfig} from "react-select";

//types
type ServerFile = {
    filename: string;
    content_type: string;
    size: number;
    category?: string; //? if empty
};

type FileWithProgress =
    {
        id: string;        //  ID
        file: File;        //  Browser-file
        progress: number;
        uploaded: boolean;
    }

// type of a category in SelectCategories
type Option = {
    value: string;
    label: string;
    color: string;
};

type FileCategoryMap = Record<string, Option | null>;


//Main component (exported)
export default function FilesPage() {

    const [files, setFiles] = useState<FileWithProgress[]>([]); // empty array of type File[]
    const [serverFiles, setServerFiles] = useState<ServerFile[]>([]);
    const [uploading, setUploading] = useState(false)
    const [selectedRows, setSelectedRows] = useState<number[]>([])
    const [fileCategory, setFileCategory] = useState<FileCategoryMap>({});//remember category for each file (fileCategory["resume.pdf"] = { value: "CV", label: "CV" }.)
    const [selectCategory, setSelectCategory] = useState<Option[]>([]);//globally remember all categories created

    const inputRef = useRef<HTMLInputElement>(null) //manually create input field

    //Refresh ServerFilelist
    async function refreshServerFiles() {
        fetch("http://localhost:8000/files")
            .then(res => res.json())
            .then(json_data => {
                setServerFiles(json_data.files); // save json
            })
    }

    useEffect(() => {
        refreshServerFiles();
    }, []);


    //fetch selected files when uploading
    function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
        if (!e.target.files?.length) {
            return;
        }

        //1. apply on each fetched file object our attributes (needed: Array conversion)
        const newFiles: FileWithProgress[] = Array.from(e.target.files).map((file) => ({
            file,
            progress: 0,
            uploaded: false,
            id: file.name,
        }))

        setFiles(prevFiles => [...prevFiles, ...newFiles]);

        //2. clear input value
        if (inputRef.current && inputRef.current.value !== '') {
            inputRef.current.value = '';
        }
    }


    async function handleUpload() {
        if (files.length === 0 || uploading) {
            return
        }

        //send files to fileupload endpoint
        setUploading(true) // upload mode (e.g. deactives buttons)

        const uploadPromises = files.map(async (fileWithProgress) => {
            const formData = new FormData();
            formData.append("file", fileWithProgress.file);
            // formData.append("category", fileCategory[fileWithProgress.file.name]?.value || ""); //pull category or none form file out of object storing multiple files with category


            try {
                await axios.post( //save answer from backend in response
                    "http://localhost:8000/upload_files", formData, { //1. send file content (binary) via fromdata
                        onUploadProgress: (progressEvent) => {
                            const progress = Math.round(
                                (progressEvent.loaded * 100) / (progressEvent.total || 1),
                            );


                            //while fileupload
                            setFiles((prevFiles) =>
                                prevFiles.map((file) =>
                                    file.id === fileWithProgress.id ? {...file, progress} : file,
                                ),
                            );
                        },
                    });
                //after file upload: set upload to true for the file
                setFiles((prevFiles) =>
                    prevFiles.map((file) =>
                        file.id === fileWithProgress.id
                            ? {...file, uploaded: true}
                            : file,
                    ),
                );
            } catch (error) {
                console.error(error);
            }


        });
        await Promise.all(uploadPromises);

        //2. gather filenames for "processing files" endpoint and send seperate
        const filenames = files.map(f => f.file.name);
        await axios.post("http://localhost:8000/process_files", {
            files: filenames.map(name => ({
                filename: name,
                category: fileCategory[name]?.value || null //initially --> category = null
            }))
        });

        setUploading(false);
        refreshServerFiles()
        setTimeout(() => setFiles([]), 1000); //clear files from upload mask automatically after 1s after successful upload
    }

    //remove from Server
    async function onRemoveServer(i: number) {
        const filename_id = serverFiles[i].filename;
        //delete backend
        await fetch(`http://localhost:8000/files/${filename_id}`, {
                method: "DELETE"
            },
        )
        //await = wait until deleted from server then call refreshServerFiles()
        await refreshServerFiles()
    }

    //remove all selected files from Server
    async function deleteSelected() {
        for (const i of selectedRows) {
            await onRemoveServer(i)
        }
        await refreshServerFiles()
        setSelectedRows([]) // clear selection afterwards
    }


    //remove from upload mask
    function removeFile(id: string) {
        setFiles(prevFiles => prevFiles.filter(item => item.id !== id))
    }

    function handleClear() {
        setFiles([])
    }


    return (
        <div className="flex flex-col gap-4">
            <h2 className="text-xl font-bold">File Upload</h2>
            <div className="flex gap-2">
                <FileInput
                    inputRef={inputRef}
                    disabled={uploading}
                    onFileSelect={handleFileSelect}
                />
                <ActionButtons
                    disabled={files.length === 0 || uploading}
                    onUpload={handleUpload}
                    onClear={handleClear}
                />
            </div>
            <FileList files={files} onRemove={removeFile} uploading={uploading}></FileList>
            <div>
                <ServerFileList
                    files={serverFiles}
                    onRemoveServer={onRemoveServer}
                    selectedRows={selectedRows}
                    setSelectedRows={setSelectedRows}
                    checked={false}
                    setChecked={false}
                    fileCategory={fileCategory}
                    setFileCategory={setFileCategory}
                    selectCategory={selectCategory}
                    setSelectCategory={setSelectCategory}
                />

            </div>
            <div>
                <button
                    onClick={deleteSelected}
                    className={`px-2 py-1 text-sm rounded cursor-pointer font-semibold 
                    ${selectedRows.length === 0
                        ? "bg-gray-700 text-white cursor-not-allowed opacity-50"
                        : "bg-red-500 text-white hover:bg-red-700 cursor-pointer"}`}>
                    Delete selected

                </button>
            </div>


        </div>)
}


// Subcomponent: Select Files Button
//Props: access function from parent component
type FileInputProps = {
    inputRef: React.RefObject<HTMLInputElement>
    disabled: boolean //disable input
    onFileSelect: (e: ChangeEvent<HTMLInputElement>) => void
}

function FileInput({inputRef, disabled, onFileSelect}: FileInputProps) {
    return (
        <>
            {/*create HTML input tag*/}
            <input
                type="file"
                ref={inputRef}
                onChange={onFileSelect}
                multiple
                className="hidden"
                id="file-upload"
                disabled={disabled}
            />
            <label
                htmlFor="file-upload"
                className="flex cursor-pointer items-center gap-2 rounded-md bg-gray-700 px-6 py-2 hover:opacity-90"
            >
                <Plus size={18}/>
                Select Files
            </label>
        </>
    );
}

//Subcomponent: Action Button
type ActionButtonsProps = {
    disabled: boolean;
    onUpload: () => void;
    onClear: () => void;
};

function ActionButtons({onUpload, onClear, disabled}: ActionButtonsProps) {
    const base = "flex items-center gap-2 rounded-md px-6 py-2 font-semibold text-black bg-gradient-to-r from-blue-500 to-blue-700 hover:opacity-80 cursor-pointer disabled:from-gray-700 disabled:to-gray-700 disabled:text-white disabled:opacity-50 disabled:cursor-not-allowed"
    return (
        <>
            <button
                onClick={onUpload}
                disabled={disabled}
                className={base}
            >
                <Upload size={18}/>
                Upload
            </button>
            <button
                onClick={onClear}
                className={base}
                disabled={disabled}
            >
                <Trash2 size={18}/>
                Clear All
            </button>
        </>
    );
}

// Subcomponent: Show File List after select Files
type FileListProps = {
    files: FileWithProgress[] //receive array
    onRemove: (id: string) => void
    uploading: boolean


}

function FileList({files, onRemove, uploading}: FileListProps) { //renders for each file in files a FileItem
    return (
        <div className="spacey-y-2">
            <h3 className="font-semibold">Files:</h3>
            <div className="spacey-y-2">
                {files.map((file) => (
                    // give each File these props
                    <FileItem
                        key={file.id}
                        file={file}
                        onRemove={onRemove}
                        uploading={uploading}
                    ></FileItem>)
                )}
            </div>

        </div>

    )
}


//Subcomponent: FileItem within FileList
type FileItemProps = {
    file: FileWithProgress;
    onRemove: (id: string) => void;
    uploading: boolean;
};

function FileItem({file, onRemove, uploading}: FileItemProps) { //state = file and not files due to FileList function
    const Icon = getFileIcon(file.file.type);

    return (
        <div className="space-y-2 rounded-md bg-gray-700 p-4">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <Icon size={40} className="text-gray-500"/>
                    <div className="flex flex-col">
                        <span className="font-medium">{file.file.name}</span>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                            <span>{formatFileSize(file.file.size)}</span>
                            <span>•</span>
                            <span>{file.file.type || 'Unknown type'}</span>
                        </div>
                    </div>
                </div>
                {!uploading && (
                    <button onClick={() => onRemove(file.id)} className="bg-none p-0 cursor-pointer">
                        <X size={16} className="text-white hover:text-gray-400"/>
                    </button>
                )}
            </div>
            <div className="text-right text-xs">
                {file.uploaded ? 'Completed' : `${Math.round(file.progress)}%`}
            </div>
            <ProgressBar progress={file.progress}/>
        </div>
    );
}


//Subcomponent: ProgressBar
type ProgressBarProps =
    {
        progress: number
    }

function ProgressBar({progress}: ProgressBarProps) {
    return (
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">
            <div
                className="h-full bg-gray-500 transition-all duration-300"
                style={{width: `${progress}%`}}
            />
        </div>
    );
}


type ServerFileListProps = {
    files: ServerFile[];
    onRemoveServer: (i: number) => void;
    selectedRows: number[];
    checked: boolean;
    setChecked: boolean;
    setSelectedRows: React.Dispatch<React.SetStateAction<number[]>>;
    selectCategory: Option[];
    setSelectCategory: React.Dispatch<React.SetStateAction<Option[]>>;
    fileCategory: FileCategoryMap;
    setFileCategory: React.Dispatch<React.SetStateAction<FileCategoryMap>>;
};


function ServerFileList({
                            files,
                            onRemoveServer,
                            selectedRows,
                            setSelectedRows,
                            selectCategory,
                            setSelectCategory,
                            fileCategory,
                            setFileCategory
                        }: ServerFileListProps) {

    function toggleRowSelection(i: number) {
        setSelectedRows(prev => {
            if (prev.includes(i)) { //2. check if selected row already part of prev selected row state
                //remove
                return prev.filter(item => item !== i)
            } else {
                //add
                return [...prev, i] //add to array of indexes of checked rows (e.g. [1,4,9]

            }
        })
    }

    function toggleSelectAll() {
        if (selectedRows.length === files.length) {
            setSelectedRows([])
        } else {
            setSelectedRows(files.map((_, index) => index)) // store all files indexes in state

        }
    }

    // --- Notion-like category management --------------------------------------

    const TAG_PALETTE = [
        '#10b981', '#3b82f6', '#f59e0b', '#ef4444',
        '#8b5cf6', '#14b8a6', '#eab308', '#f43f5e',
        '#22c55e', '#6366f1'
    ];

    function colorFromString(s: string): string {
        let h = 0;
        for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
        return TAG_PALETTE[Math.abs(h) % TAG_PALETTE.length];
    }

    function toValue(label: string): string {
        return label.trim().toLowerCase().replace(/\s+/g, '-');
    }

    const upsertGlobalOption = (opt: Option) =>
        setSelectCategory(prev =>
            prev.some(o => o.value === opt.value) ? prev : [...prev, opt]
        );


    //send new created category to backend
    const createForFile = (filename: string, label: string) => {
        const clean = label.trim();
        if (!clean) return;

        const opt: Option = {
            label: clean,
            value: toValue(clean),
            color: colorFromString(clean),
        };

        upsertGlobalOption(opt);
        setFileCategory(prev => ({...prev, [filename]: opt}));

        // Send new categor
        sendCategory(filename, clean);
    };


    const deleteCategoryEverywhere = (value: string) => {
        // remove from global set
        setSelectCategory(prev => prev.filter(o => o.value !== value));
        // clear on any file that used it
        setFileCategory(prev => {
            const next: Record<string, Option | null> = {...prev};
            Object.keys(next).forEach(fn => {
                if (next[fn]?.value === value) next[fn] = null;
            });
            return next;
        });
    };

    // Custom option row with inline delete button (Notion-like)
    const makeCustomOption =
        (onDelete: (value: string) => void) =>
            (props: OptionProps<Option, false>) => {
                const {data, isFocused, isSelected} = props;
                return (
                    <components.Option {...props}>
                        <div
                            className={`flex items-center justify-between px-2 py-1 text-sm ${
                                isFocused ? 'bg-gray-700' : 'bg-transparent'
                            }`}
                        >
                            <div className="flex items-center gap-2">
            <span
                className="inline-block h-2 w-2 rounded-full"
                style={{background: data.color}}
            />
                                <span style={{color: isSelected ? 'white' : data.color, fontWeight: 600}}>
              {data.label}
            </span>
                            </div>
                            <button
                                className="p-1 rounded hover:bg-gray-800"
                                title="Delete category"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onDelete(data.value);
                                }}
                            >
                                <Trash2 size={14}/>
                            </button>
                        </div>
                    </components.Option>
                );
            };

    const colorStyles: StylesConfig<Option, false> = {
        // NEW: cap overall width
        container: (base) => ({
            ...base,
            width: 200,            // e.g. 200px; or '12rem' or 'fit-content'
            minWidth: 0,
            flex: "0 0 auto",
        }),
        // ke
        control: (base) => ({
            ...base,
            backgroundColor: '#1f2937',
            borderColor: '#374151',
            minHeight: '32px',
            fontSize: '0.85rem',
        }),
        singleValue: (base, {data}) => ({
            ...base,
            color: data.color,
            fontWeight: 600,
        }),
        option: (base, {data, isFocused, isSelected}) => ({
            ...base,
            backgroundColor: isSelected ? data.color : isFocused ? '#374151' : '#1f2937',
            color: isSelected ? 'white' : data.color,
            cursor: 'pointer',
        }),
        menu: (base) => ({...base, zIndex: 30}),
    };

    async function sendCategory(filename: string, category: string | null) {
        try {
            await axios.post("http://localhost:8000/update_category", {
                filename,
                category,
            });
            console.log("Category updated:", category);
        } catch (error) {
            console.error("Error updating category", error);
        }
    }


    return (
        <div>
            <h4>Files on Server</h4>
            <table className="w-full border-collapse">
                <thead className="bg-gray-900 text-white">
                <tr>
                    <th className="px-4 py-2 text-left">
                        <input checked={selectedRows.length === files.length && files.length > 0}
                               onChange={toggleSelectAll} className="cursor-pointer" type="checkbox"/>
                    </th>
                    <th className="px-4 py-2 text-left">File Name</th>
                    <th className="px-4 py-2 text-left">Category</th>
                    <th className="px-4 py-2 text-left">Size (MB)</th>
                    <th className="px-4 py-2 text-left">Type</th>
                    <th className="px-4 py-2 text-left">Date Uploaded</th>
                    <th className="px-4 py-2 text-left">Actions</th>
                </tr>
                </thead>
                <tbody>
                {/*gives every file the following array object <tr> (wrapper with key = {i}*/}
                {files.map((file, i) => (
                    <tr key={i} className="hover:bg-gray-700 even:bg-gray-800">
                        <td className="px-4 py-2">
                            <input
                                className="cursor-pointer"
                                type="checkbox"
                                checked={selectedRows.includes(i)} //Index of row already stored in state = checked
                                onChange={() => toggleRowSelection(i)} //1. when clicking, pass the function the files rows index
                            />
                        </td>
                        <td className="px-4 py-2 flex items-center gap-2">
                            <FileIcon/> {file.filename}
                        </td>
                        <td className="px-4 py-2">
                            <CreatableSelect<Option, false>
                                isClearable
                                options={selectCategory}
                                //show current category for each file
                                value={fileCategory[file.filename] ?? null}

                                //1. save category per file
                                onChange={(option) => {
                                    const selected = (option as Option) ?? null;
                                    // select / clear
                                    setFileCategory(prev => ({
                                        ...prev, //all file + option combinations
                                        [file.filename]: (option as Option) ?? null,
                                    }));

                                    //2.Send category to backend
                                    sendCategory(file.filename, selected ? selected.label : null)

                                }}

                                onCreateOption={(input) => createForFile(file.filename, input)}
                                formatCreateLabel={(input) => `+ Create "${input}"`}
                                noOptionsMessage={() => 'Type to create'}
                                components={{
                                    Option: makeCustomOption(deleteCategoryEverywhere),
                                }}
                                styles={colorStyles}
                                placeholder="Select or create..."
                            />
                        </td>
                        <td className="px-4 py-2">{(file.size / (1024 * 1024)).toFixed(2)} MB
                        </td>
                        <td className="px-4 py-2">{file.content_type.split("/")[1]}</td>
                        <td className="px-4 py-2">{new Date().toLocaleDateString()}</td>
                        <td className="px-4 py-2">
                            <button
                                className="px-2 py-1 rounded-md  text-white font-semibold hover:bg-red-700 cursor-pointer disabled:opacity-10 disabled:bg-gray-500 disabled:cursor-not-allowed"
                                onClick={() => onRemoveServer(i)}
                            >
                                Delete
                            </button>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
            <p> {files.length} files on server </p>
        </div>
    );
}


//Helper functions
const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return FileImage;
    if (mimeType.startsWith('video/')) return FileVideo;
    if (mimeType.startsWith('audio/')) return FileAudio;
    if (mimeType === 'application/pdf') return FileText;
    return FileIcon;
};

const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}


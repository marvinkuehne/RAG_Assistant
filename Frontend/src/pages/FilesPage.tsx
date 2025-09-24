import {type ChangeEvent, useEffect, useRef, useState} from "react";
import {Plus} from 'lucide-react';


//Main component (exported)
export default function FilesPage() {

    //typ server file
    type ServerFile = {
        filename: string;
        content_type: string;
        size: number;
    };


    const [files, setFiles] = useState<File[]>([]); // empty array of type File[]
    const [serverFiles, setServerFiles] = useState<ServerFile[]>([]);

    const inputRef = useRef<HTMLInputElement>(null) //manually create input field

    //Show files on server when refreshing/intital access
    useEffect(() => {
        fetch("http://localhost:8000/files")
            .then(res => res.json()) //read body of response object from backend. .then automatically sends it to next line
            .then(json_data => {
                setServerFiles(json_data.files); // save json
            })
    }, []);

    //fetch selected files when uploading
    function handleChange(e) {
        const fileList = e.target.files;
        setFiles(prevFiles => [...prevFiles, ...fileList]); //takes previous files already uploaded and adds the new selected files

        //Show "uploading" patch when selecting files
        for (const file of fileList) {
            console.log("Uploading: " + file.name);
        }

        //Send selected files to backend (we use .then, async function not used)
        for (const file of fileList) {
            const formData = new FormData(); // create formData object (container for my data) for each file, um im gegensatz mit json auch den binarinhalt zu schicken (sprich den inhalt der pdf etc.)
            formData.append("file", file) // pack file object into formdata(browswer object) to make it ready to be sent to backend with name "file"!!

            //sends HTTP to the url. Backend receives request and sends back response object
            fetch("http://localhost:8000/upload_files", {
                method: "POST",
                body: formData,
            })

                //Display response object from server (backend)
                .then(response => response.json()) //read body from response object and return in json to next .then

                //append response(files) in ServerFiles state to have always up-to-date frontend represenation of backend
                .then(response => {

                    const newFile: ServerFile = {
                        filename: response.filename,
                        size: response.size,
                        content_type: response.content_type,
                    };
                    // 3. Neues File an das bisherige Array anhängen

                    setServerFiles(prev => {
                        const updated = [...prev, newFile];
                        console.log("Current ServerFiles-State:", updated);
                        return updated;
                    });
                });
        }

    }

    function handleRemove(i: number) {
        const filename_id = serverFiles[i].filename;
        //delete backend
        fetch(`http://localhost:8000/files/${filename_id}`, {
                method: "DELETE"
            },
        )
        //delete frontend
        setServerFiles(serverFiles.filter(item => item.filename !== serverFiles[i].filename)
        );
    }

    // function FileList(files: File[]) {
    //     return (
    //         <div>
    //             <h4>Files selected</h4>
    //             <table>
    //                 <thead>
    //                 <tr>
    //                     <th>File Name</th>
    //                     <th>Size (MB)</th>
    //                     <th>Actions</th>
    //                 </tr>
    //                 </thead>
    //                 <tbody>
    //                 {files.map((file) => (
    //                     <tr>
    //                         <td> {file.name} </td>
    //                         <td> {(file.size / (1024 * 1024)).toFixed(2)} MB</td>
    //
    //                     </tr>
    //                 ))}
    //                 </tbody>
    //             </table>
    //             <p> {files.length} files selected </p>
    //         </div>
    //     );
    // }


    function printServerFileList(files: ServerFile[]) {
        return (
            <div>
                <h4>Files on Server</h4>
                <table>
                    <thead>
                    <tr>
                        <th>File Name</th>
                        <th>Size (MB)</th>
                        <th>Content type</th>
                        <th>Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {files.map((file, i) => (
                        <tr>
                            <td> {file.filename} </td>
                            <td> {(file.size / (1024 * 1024)).toFixed(2)} MB</td>
                            <td> {file.content_type} </td>
                            <td>
                                <button onClick={() => handleRemove(i)}>Delete</button>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                <p> {files.length} files on server </p>
            </div>
        );
    }

    return (
        <div>
            <h2 className="  text-red-700">File Upload</h2>
            <div className="flex gap-2">
                <FileInput inputRef={inputRef} disabled={false} onFileSelect={handleChange}/>
            </div>
            {/*<div>*/}
            {/*    {FileList(files)}*/}
            {/*</div>*/}
            <div>
                {printServerFileList(serverFiles)}
            </div>

            <button className="px-4 py-2 bg-blue-500 hover:bg-blue-700 text-white rounded">
                Upload
            </button>

            <div className="bg-green-500 text-white p-4">
                Tailwind test box
            </div>
            <h2 className="text-xl font-bold text-red-700 !text-red-700">File Upload</h2>
            <h2 className="!text-red-600 text-xl font-bold">File Upload</h2>


        </div>)
}

//Props FileInput Component
type FileInputProps = {
    inputRef: React.RefObject<HTMLInputElement>
    disabled: boolean //disable input
    onFileSelect: (e: ChangeEvent<HTMLInputElement>) => void
}

// Subcomponent
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
                className="flex cursor-pointer items-center gap-2 rounded-md bg-grayscale-700 px-6 py-2 hover:opacity-90"
            >
                <Plus size={18}/>
                Select Files
            </label>
        </>
    );
}
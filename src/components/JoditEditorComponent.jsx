"use client";
import React, { useMemo, useRef } from "react";
import JoditEditor from "jodit-react";

const JoditEditorComponent = ({ value, onChange }) => {
  const editor = useRef(null);

  const config = useMemo(
    () => ({
      readonly: false,
      height: 400,
      toolbarAdaptive: false,
      buttons: [
        "bold",
        "italic",
        "underline",
        "|",
        "ul",
        "ol",
        "|",
        "link",
        "image",
        "|",
        "undo",
        "redo",
      ],
      placeholder: "Start typing...",
    }),
    []
  );

  return (
    <JoditEditor
      ref={editor}
      value={value}
      config={config}
      onBlur={(newContent) => onChange(newContent)} // Trigger onChange when content changes
      onChange={() => {}} // Required by Jodit but not used here
    />
  );
};

export default JoditEditorComponent;

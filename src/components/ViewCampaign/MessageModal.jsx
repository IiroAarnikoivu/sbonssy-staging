"use client";
import React from "react";

/**
 * Modal for composing and sending a message.
 * @param {Object} props
 * @param {{id: string, name: string}|null} [props.messageDetails=null]
 * @param {string} [props.message=""]
 * @param {(v: string) => void} [props.setMessage=() => {}]
 * @param {boolean} [props.isSending=false]
 * @param {() => void} [props.onClose=() => {}]
 * @param {(e: React.FormEvent) => void} [props.onSubmit=() => {}]
 * @param {(key: string) => string} props.t
 */
const MessageModal = ({
  messageDetails = null,
  message = "",
  setMessage = () => {},
  isSending = false,
  onClose = () => {},
  onSubmit = () => {},
  t,
}) => {
  if (!messageDetails) return null;
  return (
    <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">
              {t("message")} {messageDetails.name}
            </h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              ✕
            </button>
          </div>
          <form onSubmit={onSubmit}>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-3 border rounded-lg mb-4 min-h-[150px]"
              placeholder={t("placeholder")}
              required
              disabled={isSending}
            />
            <div className="flex justify-end gap-3">
              <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg" disabled={isSending}>
                {t("cancel2")}
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#F26915] text-white rounded-lg disabled:bg-[#F26915]"
                disabled={isSending || !message.trim()}
              >
                {isSending ? `${t("sending")}` : `${t("send")}`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MessageModal;

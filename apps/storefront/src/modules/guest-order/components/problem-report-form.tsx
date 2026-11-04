"use client"

import {
  submitProblemReport,
  uploadProblemPhoto,
} from "@lib/data/problem-report"
import { translator, type Key } from "@lib/i18n/dictionary"
import { useLocale } from "@lib/i18n/use-translate"
import type { GuestOrder, GuestProblemReport } from "@lib/util/guest-order"
import {
  isAnimalKind,
  kindKey,
  MAX_PHOTOS,
  photoProblem,
  PROBLEM_KINDS,
  problemFailureKey,
  problemFormErrors,
  receivedAtOf,
  type ProblemFormErrors,
  type ProblemKind,
} from "@lib/util/problem-report"
import { Button } from "@modules/common/components/ui"
import { useRef, useState, useTransition, type FormEvent } from "react"

/** A file as base64 text (no `data:` prefix), the shape the photo route takes. */
const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error ?? new Error("read failed"))
    reader.onload = () => {
      const text = String(reader.result ?? "")
      resolve(text.slice(text.indexOf(",") + 1))
    }
    reader.readAsDataURL(file)
  })

/**
 * THE PROBLEM REPORT FORM (V1.2, slice 3): "Probléma a szállítmánnyal". It opens under an order on the guest
 * page and files a report for THAT order with the pair the customer already typed (the order's own number and the
 * address). The photos go up one by one first; the report names them by the ids the shop gave. EVERYTHING the
 * customer typed stays on a failure (the text says so); a success shows the case reference and closes nothing
 * the customer did not ask to close. The legal placeholders ([KITÖLTENDŐ]) stand as they are.
 */
export default function ProblemReportForm({
  order,
  email,
  onClose,
  onFiled,
}: {
  order: GuestOrder
  email: string
  onClose: () => void
  /** The shop took the report, or said the problem is already reported: the list under the order may have changed. */
  /**
   * The report is filed (with the order's list of reports as the shop answered it) or refused as already reported
   * (no list: the failed answer carries nothing but its status).
   */
  onFiled?: (reports?: GuestProblemReport[]) => void
}) {
  const locale = useLocale()
  const t = translator(locale)
  const [kind, setKind] = useState<ProblemKind | "">("")
  const [itemIds, setItemIds] = useState<string[]>([])
  const [received, setReceived] = useState("")
  const [description, setDescription] = useState("")
  const [phone, setPhone] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [errors, setErrors] = useState<ProblemFormErrors>({})
  const [photoNote, setPhotoNote] = useState<string | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const [doneId, setDoneId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const picker = useRef<HTMLInputElement | null>(null)
  // a photo that already went up keeps its id, so a retry after a failed report does not upload it again
  // (the shop caps the uploads no report has taken, and a failed try must not use that cap up)
  const uploadedIds = useRef(new Map<File, string>())
  const orderNumber = String(order.display_id)

  const addFiles = (picked: FileList | null) => {
    if (!picked) return
    setPhotoNote(null)
    const next = [...files]
    for (const file of Array.from(picked)) {
      const problem = photoProblem(file)
      if (problem) {
        setPhotoNote(t(problem))
        continue
      }
      if (next.length >= MAX_PHOTOS) {
        setPhotoNote(t("guestOrder.problem.photoErrorCount"))
        break
      }
      next.push(file)
    }
    setFiles(next)
    if (picker.current) picker.current.value = ""
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setFailure(null)
    const found = problemFormErrors({ kind, itemIds, description, phone })
    setErrors(found)
    if (Object.keys(found).length > 0 || kind === "") return
    startTransition(async () => {
      const photoIds: string[] = []
      for (const file of files) {
        const known = uploadedIds.current.get(file)
        if (known) {
          photoIds.push(known)
          continue
        }
        let content: string
        try {
          content = await toBase64(file)
        } catch {
          setFailure(
            t("guestOrder.problem.photoErrorUpload", { name: file.name }),
          )
          return
        }
        const uploaded = await uploadProblemPhoto({
          orderNumber,
          email,
          content,
        })
        if (!uploaded.ok) {
          setFailure(
            uploaded.failure === "unavailable" || uploaded.failure === "invalid"
              ? t("guestOrder.problem.photoErrorUpload", { name: file.name })
              : t(problemFailureKey(uploaded.failure)),
          )
          return
        }
        uploadedIds.current.set(file, uploaded.photoId)
        photoIds.push(uploaded.photoId)
      }
      const result = await submitProblemReport({
        orderNumber,
        email,
        kind,
        itemIds,
        receivedAt: receivedAtOf(received),
        description: description.trim(),
        phone,
        photoIds,
      })
      if (result.ok) {
        setDoneId(result.reportId)
        onFiled?.(result.problemReports)
      } else {
        if (result.failure === "duplicate") onFiled?.()
        // "invalid" may mean a photo the shop no longer accepts: the next try uploads them afresh
        if (result.failure === "invalid") uploadedIds.current.clear()
        setFailure(t(problemFailureKey(result.failure)))
      }
    })
  }

  if (doneId)
    return (
      <div
        className="flex flex-col gap-y-3 border border-acr-heritage px-4 py-3"
        data-testid="problem-done"
      >
        <p className="text-[14px] text-acr-ink">
          {t("guestOrder.problem.done", { id: doneId })}
        </p>
        <Button type="button" onClick={onClose}>
          {t("guestOrder.problem.close")}
        </Button>
      </div>
    )

  const fieldError = (key: Key | undefined, id: string) =>
    key ? (
      <p role="alert" className="text-[13px] text-acr-ink" data-testid={id}>
        {t(key)}
      </p>
    ) : null

  return (
    <form
      onSubmit={submit}
      noValidate
      className="flex flex-col gap-y-4 border border-acr-slate/30 px-4 py-4"
      data-testid={`problem-form-${order.display_id}`}
    >
      <div className="flex flex-col gap-y-1">
        <h3 className="text-[16px] font-semibold text-acr-ink">
          {t("guestOrder.problem.title")}
        </h3>
        <p className="text-[13px] text-acr-slate">
          {t("guestOrder.problem.intro")}
        </p>
      </div>

      <fieldset className="flex flex-col gap-y-1">
        <legend className="text-[14px] font-semibold text-acr-ink">
          {t("guestOrder.problem.itemsLabel")}
        </legend>
        {order.items.map((item) => (
          <label
            key={item.id}
            className="flex items-center gap-x-2 text-[14px] text-acr-ink"
          >
            <input
              type="checkbox"
              checked={itemIds.includes(item.id)}
              onChange={(event) =>
                setItemIds((current) =>
                  event.target.checked
                    ? [...current, item.id]
                    : current.filter((id) => id !== item.id),
                )
              }
            />
            {item.title} × {item.quantity}
          </label>
        ))}
        {fieldError(errors.itemIds, "problem-items-error")}
      </fieldset>

      <div className="flex flex-col gap-y-1">
        <label
          htmlFor={`problem-kind-${order.display_id}`}
          className="text-[14px] font-semibold text-acr-ink"
        >
          {t("guestOrder.problem.kindLabel")}
        </label>
        <select
          id={`problem-kind-${order.display_id}`}
          value={kind}
          onChange={(event) => setKind(event.target.value as ProblemKind | "")}
          className="border border-acr-slate/40 px-3 py-2 text-[15px] text-acr-ink"
        >
          <option value="">{t("guestOrder.problem.kindPlaceholder")}</option>
          {PROBLEM_KINDS.map((value) => (
            <option key={value} value={value}>
              {t(kindKey(value))}
            </option>
          ))}
        </select>
        {fieldError(errors.kind, "problem-kind-error")}
        {isAnimalKind(kind) && (
          <p
            className="text-[13px] text-acr-ink"
            data-testid="problem-live-note"
          >
            {t("guestOrder.problem.liveNote")}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-y-1">
        <label
          htmlFor={`problem-received-${order.display_id}`}
          className="text-[14px] font-semibold text-acr-ink"
        >
          {t("guestOrder.problem.receivedLabel")}
        </label>
        <input
          id={`problem-received-${order.display_id}`}
          type="datetime-local"
          value={received}
          onChange={(event) => setReceived(event.target.value)}
          className="border border-acr-slate/40 px-3 py-2 text-[15px] text-acr-ink"
        />
      </div>

      <div className="flex flex-col gap-y-1">
        <label
          htmlFor={`problem-description-${order.display_id}`}
          className="text-[14px] font-semibold text-acr-ink"
        >
          {t("guestOrder.problem.descriptionLabel")}
        </label>
        <textarea
          id={`problem-description-${order.display_id}`}
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="border border-acr-slate/40 px-3 py-2 text-[15px] text-acr-ink"
        />
        <p className="text-[13px] text-acr-slate">
          {t("guestOrder.problem.descriptionHelp")}
        </p>
        {fieldError(errors.description, "problem-description-error")}
      </div>

      <div className="flex flex-col gap-y-1">
        <label
          htmlFor={`problem-phone-${order.display_id}`}
          className="text-[14px] font-semibold text-acr-ink"
        >
          {t("guestOrder.problem.phoneLabel")}
        </label>
        <input
          id={`problem-phone-${order.display_id}`}
          type="tel"
          autoComplete="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          className="border border-acr-slate/40 px-3 py-2 text-[15px] text-acr-ink"
        />
        <p className="text-[13px] text-acr-slate">
          {t("guestOrder.problem.phoneHelp")}
        </p>
        {fieldError(errors.phone, "problem-phone-error")}
      </div>

      <div className="flex flex-col gap-y-2">
        <p className="text-[14px] font-semibold text-acr-ink">
          {t("guestOrder.problem.photosLabel")}
        </p>
        <p className="text-[13px] text-acr-slate">
          {t("guestOrder.problem.photosHelp")}
        </p>
        <ul className="flex flex-col gap-y-1" data-testid="problem-files">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center justify-between gap-x-3 text-[14px] text-acr-ink"
            >
              <span>{file.name}</span>
              <button
                type="button"
                className="text-[13px] underline"
                onClick={() =>
                  setFiles((current) => current.filter((_, i) => i !== index))
                }
              >
                {t("guestOrder.problem.removePhoto")}
              </button>
            </li>
          ))}
        </ul>
        <input
          ref={picker}
          type="file"
          accept="image/jpeg,image/png"
          multiple
          hidden
          data-testid="problem-file-input"
          onChange={(event) => addFiles(event.target.files)}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={() => picker.current?.click()}
        >
          {t("guestOrder.problem.addPhoto")}
        </Button>
        {photoNote && (
          <p
            role="alert"
            className="text-[13px] text-acr-ink"
            data-testid="problem-photo-note"
          >
            {photoNote}
          </p>
        )}
      </div>

      <Button type="submit" disabled={pending} data-testid="problem-submit">
        {pending
          ? t("guestOrder.problem.sending")
          : t("guestOrder.problem.submit")}
      </Button>
      {failure && (
        <p
          role="alert"
          className="text-[14px] text-acr-ink"
          data-testid="problem-failure"
        >
          {failure}
        </p>
      )}
    </form>
  )
}

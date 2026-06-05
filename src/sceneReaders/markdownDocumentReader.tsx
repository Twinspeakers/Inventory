import type { ReactNode, WheelEvent as ReactWheelEvent } from "react";
import { isValidElement, useEffect, useMemo, useState } from "react";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy } from "lucide-react";
import type { InventoryCodeTheme } from "../shikiHighlighter";
import { getImageMimeType, readPreviewBytes, toArrayBuffer } from "./previewIo";

export type MarkdownDocumentAsset = {
  name: string;
  path: string;
};

type MarkdownHeading = {
  depth: 1 | 2 | 3 | 4 | 5 | 6;
  id: string;
  text: string;
};

export function MarkdownPreview({ asset, previewBackground }: { asset: MarkdownDocumentAsset; previewBackground: string }) {
  const { errorMessage, isLoading, text } = useTextPreview(asset);
  const [zoom, setZoom] = useState(1);
  const message = errorMessage ?? (isLoading ? "Loading Markdown..." : "");
  const headings = useMemo(() => extractMarkdownHeadings(text), [text]);
  const headingIdLookup = useMemo(() => buildHeadingIdLookup(headings), [headings]);
  const codeTheme: InventoryCodeTheme = isLightHexColor(previewBackground) ? "github-light" : "github-dark";
  const markdownComponents = useMemo<Components>(
    () => ({
      a({ children, href }) {
        return (
          <MarkdownLink href={href} markdownPath={asset.path}>
            {children}
          </MarkdownLink>
        );
      },
      img({ alt, src }) {
        return <MarkdownImage alt={alt ?? ""} markdownPath={asset.path} src={src} />;
      },
      pre({ children }) {
        return <MarkdownPre codeTheme={codeTheme} node={children} />;
      },
      h1({ children }) {
        return (
          <MarkdownHeadingElement headingIdLookup={headingIdLookup} level={1}>
            {children}
          </MarkdownHeadingElement>
        );
      },
      h2({ children }) {
        return (
          <MarkdownHeadingElement headingIdLookup={headingIdLookup} level={2}>
            {children}
          </MarkdownHeadingElement>
        );
      },
      h3({ children }) {
        return (
          <MarkdownHeadingElement headingIdLookup={headingIdLookup} level={3}>
            {children}
          </MarkdownHeadingElement>
        );
      },
      h4({ children }) {
        return (
          <MarkdownHeadingElement headingIdLookup={headingIdLookup} level={4}>
            {children}
          </MarkdownHeadingElement>
        );
      },
      h5({ children }) {
        return (
          <MarkdownHeadingElement headingIdLookup={headingIdLookup} level={5}>
            {children}
          </MarkdownHeadingElement>
        );
      },
      h6({ children }) {
        return (
          <MarkdownHeadingElement headingIdLookup={headingIdLookup} level={6}>
            {children}
          </MarkdownHeadingElement>
        );
      },
    }),
    [asset.path, codeTheme, headingIdLookup],
  );

  useEffect(() => {
    setZoom(1);
  }, [asset.path]);

  function handleMarkdownWheel(event: ReactWheelEvent<HTMLDivElement>) {
    if (!event.ctrlKey && !event.metaKey) {
      return;
    }

    event.preventDefault();
    const zoomFactor = event.deltaY > 0 ? 0.92 : 1.08;
    setZoom((value) => clampNumber(Number((value * zoomFactor).toFixed(3)), 0.7, 2.2));
  }

  return (
    <div className="relative h-full min-h-full bg-preview">
      <div className="h-full min-h-0 overflow-auto px-6 py-8" onWheel={handleMarkdownWheel}>
        {message ? (
          <div className="pointer-events-none absolute left-1/2 top-5 z-10 max-w-sm -translate-x-1/2 rounded-sm border border-line bg-surface/95 px-3 py-2 text-center text-sm text-muted shadow-soft">
            {message}
          </div>
        ) : null}
        {text ? (
          <div className="markdown-preview-layout mx-auto grid max-w-6xl gap-4 xl:grid-cols-[minmax(0,1fr)_220px]">
            <article className="markdown-document min-w-0 border border-line bg-surface/75 px-10 py-9 shadow-soft" style={{ fontSize: `${zoom}rem` }}>
              <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>
                {text}
              </ReactMarkdown>
            </article>
            {headings.length > 1 ? <MarkdownOutline headings={headings} /> : null}
          </div>
        ) : null}
      </div>
      <div className="pointer-events-none absolute bottom-3 right-3 z-20 rounded-sm border border-line bg-surface/90 px-2 py-1 text-xs font-medium text-muted shadow-soft">
        {Math.round(zoom * 100)}%
      </div>
    </div>
  );
}

export function MarkdownThumbnail({ asset, fallback }: { asset: MarkdownDocumentAsset; fallback: ReactNode }) {
  const { errorMessage, isLoading, text } = useTextPreview(asset);
  const summary = useMemo(() => summarizeMarkdown(text, asset.name), [asset.name, text]);

  if (errorMessage) {
    return fallback;
  }

  return (
    <div className="markdown-thumbnail relative aspect-[4/3] overflow-hidden rounded-sm border border-line bg-preview p-3 text-left shadow-soft">
      <div className="mb-2 flex items-center justify-between gap-2 text-[10px] font-semibold uppercase text-muted">
        <span>Markdown</span>
        <span>.md</span>
      </div>
      {isLoading ? (
        <div className="space-y-2 pt-1">
          <span className="block h-3 w-3/4 rounded-sm bg-surface-raised" />
          <span className="block h-2 w-full rounded-sm bg-surface" />
          <span className="block h-2 w-5/6 rounded-sm bg-surface" />
          <span className="block h-2 w-2/3 rounded-sm bg-surface" />
        </div>
      ) : (
        <>
          <h3 className="markdown-thumbnail-title text-sm font-semibold leading-snug text-ink">{summary.title}</h3>
          {summary.excerpt ? <p className="markdown-thumbnail-excerpt mt-2 text-xs leading-relaxed text-muted">{summary.excerpt}</p> : null}
        </>
      )}
      <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />
    </div>
  );
}

export function isMarkdownExtension(extension: string) {
  return extension.toLowerCase() === "md";
}

function useTextPreview(asset: MarkdownDocumentAsset) {
  const [text, setText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    setText("");
    setErrorMessage(null);
    setIsLoading(true);

    async function loadText() {
      try {
        const bytes = await readPreviewBytes(asset.path);
        const nextText = decodePreviewText(bytes);

        if (cancelled) {
          return;
        }

        setText(nextText);
        setIsLoading(false);
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(`Could not render Markdown: ${String(error)}`);
          setIsLoading(false);
        }
      }
    }

    void loadText();

    return () => {
      cancelled = true;
    };
  }, [asset.path]);

  return { errorMessage, isLoading, text };
}

function MarkdownOutline({ headings }: { headings: MarkdownHeading[] }) {
  return (
    <nav className="markdown-outline hidden max-h-[calc(100vh-13rem)] overflow-auto border-l border-line pl-3 text-sm xl:block" aria-label="Markdown outline">
      <p className="mb-2 text-xs font-semibold uppercase text-muted">Outline</p>
      <div className="space-y-1">
        {headings.map((heading) => (
          <button
            className="block w-full truncate rounded-sm px-2 py-1 text-left text-muted transition hover:bg-surface-raised hover:text-ink"
            key={heading.id}
            onClick={() => document.getElementById(heading.id)?.scrollIntoView({ block: "start", behavior: "smooth" })}
            style={{ paddingLeft: `${0.5 + (heading.depth - 1) * 0.65}rem` }}
            title={heading.text}
          >
            {heading.text}
          </button>
        ))}
      </div>
    </nav>
  );
}

function MarkdownHeadingElement({
  children,
  headingIdLookup,
  level,
}: {
  children: ReactNode;
  headingIdLookup: Map<string, string>;
  level: MarkdownHeading["depth"];
}) {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  const text = getReactNodeText(children);
  const id = headingIdLookup.get(getHeadingLookupKey(level, text)) ?? slugifyHeading(text);

  return <Tag id={id}>{children}</Tag>;
}

function MarkdownLink({ children, href, markdownPath }: { children: ReactNode; href?: string; markdownPath: string }) {
  if (!href) {
    return <a>{children}</a>;
  }

  if (href.startsWith("#")) {
    return <a href={href}>{children}</a>;
  }

  if (isExternalMarkdownUrl(href)) {
    return (
      <a href={href} rel="noreferrer" target="_blank">
        {children}
      </a>
    );
  }

  const linkedPath = resolveMarkdownLocalPath(markdownPath, href);

  return (
    <a
      className="markdown-local-link"
      href="#"
      onClick={(event) => event.preventDefault()}
      title={linkedPath ? `Local link: ${linkedPath}` : "Local link"}
    >
      {children}
    </a>
  );
}

function MarkdownImage({ alt, markdownPath, src }: { alt: string; markdownPath: string; src?: string }) {
  const { errorMessage, imageUrl, isLoading } = useMarkdownImageSource(markdownPath, src);

  if (isLoading) {
    return <span className="markdown-image-message">Loading image...</span>;
  }

  if (!imageUrl || errorMessage) {
    return <span className="markdown-image-message">{alt || "Image could not be loaded."}</span>;
  }

  return (
    <figure className="markdown-image-frame">
      <img alt={alt} src={imageUrl} />
      {alt ? <figcaption>{alt}</figcaption> : null}
    </figure>
  );
}

function useMarkdownImageSource(markdownPath: string, source?: string) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(source));

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    setImageUrl(null);
    setErrorMessage(null);
    setIsLoading(Boolean(source));

    async function loadImage() {
      if (!source) {
        setIsLoading(false);
        return;
      }

      if (isDirectMarkdownImageSource(source)) {
        setImageUrl(source);
        setIsLoading(false);
        return;
      }

      const resolvedPath = resolveMarkdownLocalPath(markdownPath, source);

      if (!resolvedPath) {
        setErrorMessage("Image path is not supported.");
        setIsLoading(false);
        return;
      }

      try {
        const bytes = await readPreviewBytes(resolvedPath);
        const nextUrl = URL.createObjectURL(new Blob([toArrayBuffer(bytes)], { type: getImageMimeType(getFileExtension(resolvedPath)) }));

        if (cancelled) {
          URL.revokeObjectURL(nextUrl);
          return;
        }

        objectUrl = nextUrl;
        setImageUrl(nextUrl);
        setIsLoading(false);
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(String(error));
          setIsLoading(false);
        }
      }
    }

    void loadImage();

    return () => {
      cancelled = true;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [markdownPath, source]);

  return { errorMessage, imageUrl, isLoading };
}

function MarkdownPre({ codeTheme, node }: { codeTheme: InventoryCodeTheme; node: ReactNode }) {
  const child = Array.isArray(node) ? node[0] : node;
  const codeElement = isValidElement<{ className?: string; children?: ReactNode }>(child) ? child : null;
  const className = codeElement?.props.className ?? "";
  const language = getLanguageFromClassName(className);
  const code = codeElement ? getReactNodeText(codeElement.props.children).replace(/\n$/, "") : getReactNodeText(node);

  if (!language) {
    return (
      <pre>
        <code>{code}</code>
      </pre>
    );
  }

  return <MarkdownCodeBlock code={code} codeTheme={codeTheme} language={language} />;
}

function MarkdownCodeBlock({
  code,
  codeTheme,
  language,
}: {
  code: string;
  codeTheme: InventoryCodeTheme;
  language: string;
}) {
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setHighlightedHtml(null);
    setFailed(false);

    async function highlightCode() {
      try {
        const { highlightMarkdownCode } = await import("../shikiHighlighter");
        const html = await highlightMarkdownCode(code, language, codeTheme);

        if (!cancelled) {
          setHighlightedHtml(html);
        }
      } catch {
        if (!cancelled) {
          setFailed(true);
        }
      }
    }

    void highlightCode();

    return () => {
      cancelled = true;
    };
  }, [code, codeTheme, language]);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="markdown-code-block">
      <div className="markdown-code-header">
        <span>{language}</span>
        <button className="dark-icon-button" title={copied ? "Copied" : "Copy code"} onClick={copyCode}>
          <Copy size={13} aria-hidden="true" />
        </button>
      </div>
      {highlightedHtml && !failed ? (
        <div className="markdown-shiki" dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
      ) : (
        <pre>
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
}

function decodePreviewText(bytes: Uint8Array) {
  return new TextDecoder("utf-8").decode(bytes).replace(/^\uFEFF/, "");
}

function isLightHexColor(hex: string) {
  const normalized = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : "#111111";
  const value = Number.parseInt(normalized.slice(1), 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255 > 0.55;
}

function extractMarkdownHeadings(text: string): MarkdownHeading[] {
  const slugs = new Map<string, number>();
  const headings: MarkdownHeading[] = [];
  let insideFence = false;

  for (const line of text.replace(/\r\n/g, "\n").split("\n")) {
    if (/^\s*```/.test(line)) {
      insideFence = !insideFence;
      continue;
    }

    if (insideFence) {
      continue;
    }

    const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line.trim());

    if (!match) {
      continue;
    }

    const depth = match[1].length as MarkdownHeading["depth"];
    const headingText = stripMarkdownInline(match[2]);
    const baseSlug = slugifyHeading(headingText);
    const usedCount = slugs.get(baseSlug) ?? 0;
    slugs.set(baseSlug, usedCount + 1);
    headings.push({
      depth,
      id: usedCount > 0 ? `${baseSlug}-${usedCount + 1}` : baseSlug,
      text: headingText,
    });
  }

  return headings;
}

function buildHeadingIdLookup(headings: MarkdownHeading[]) {
  const lookup = new Map<string, string>();

  for (const heading of headings) {
    const key = getHeadingLookupKey(heading.depth, heading.text);

    if (!lookup.has(key)) {
      lookup.set(key, heading.id);
    }
  }

  return lookup;
}

function getHeadingLookupKey(depth: MarkdownHeading["depth"], text: string) {
  return `${depth}:${text.toLowerCase()}`;
}

function slugifyHeading(text: string) {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  return slug || "section";
}

function summarizeMarkdown(text: string, fallbackName: string) {
  const fallbackTitle = fallbackName.replace(/\.md$/i, "") || "Markdown document";
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const headingLine = lines.find((line) => /^#{1,6}\s+\S/.test(line.trim()));
  const title = headingLine ? stripMarkdownInline(headingLine.replace(/^#{1,6}\s+/, "")) || fallbackTitle : fallbackTitle;
  const excerpt = lines
    .filter((line) => {
      const trimmed = line.trim();
      return trimmed && !/^#{1,6}\s+\S/.test(trimmed) && !/^```/.test(trimmed) && !/^---+$/.test(trimmed);
    })
    .map(stripMarkdownInline)
    .filter(Boolean)
    .join(" ")
    .slice(0, 180);

  return { excerpt, title };
}

function stripMarkdownInline(value: string) {
  return value
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[`*_~>#-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getReactNodeText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") {
    return "";
  }

  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(getReactNodeText).join("");
  }

  if (isValidElement<{ children?: ReactNode }>(node)) {
    return getReactNodeText(node.props.children);
  }

  return "";
}

function getLanguageFromClassName(className: string) {
  return /language-([\w+-]+)/.exec(className)?.[1] ?? "";
}

function isExternalMarkdownUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function isDirectMarkdownImageSource(value: string) {
  return /^(https?:|data:|blob:)/i.test(value);
}

function resolveMarkdownLocalPath(markdownPath: string, source: string) {
  const cleanedSource = cleanMarkdownResourceSource(source);

  if (!cleanedSource || cleanedSource.startsWith("#") || /^[a-z]+:/i.test(cleanedSource)) {
    return null;
  }

  if (isAbsoluteFilePath(cleanedSource)) {
    return normalizeFilePath(cleanedSource, cleanedSource.includes("\\") ? "\\" : "/");
  }

  const directory = getAssetDirectoryPath(markdownPath);
  const separator = directory.includes("\\") ? "\\" : "/";
  return normalizeFilePath(`${directory}${directory.endsWith(separator) ? "" : separator}${cleanedSource}`, separator);
}

function cleanMarkdownResourceSource(source: string) {
  const withoutHash = source.split("#")[0] ?? "";
  const withoutQuery = withoutHash.split("?")[0] ?? "";
  return safeDecodeURIComponent(withoutQuery.trim());
}

function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function isAbsoluteFilePath(path: string) {
  return /^[a-zA-Z]:[\\/]/.test(path) || /^\\\\/.test(path) || path.startsWith("/");
}

function getAssetDirectoryPath(path: string) {
  const separatorIndex = Math.max(path.lastIndexOf("\\"), path.lastIndexOf("/"));
  return separatorIndex === -1 ? "" : path.slice(0, separatorIndex);
}

function normalizeFilePath(path: string, separator: "\\" | "/") {
  const normalized = path.replace(/[\\/]+/g, separator);
  const drive = /^[a-zA-Z]:/.exec(normalized)?.[0] ?? "";
  const startsWithSeparator = normalized.startsWith(separator);
  const rest = drive ? normalized.slice(drive.length) : normalized;
  const segments = rest.split(separator).filter(Boolean);
  const stack: string[] = [];

  for (const segment of segments) {
    if (segment === ".") {
      continue;
    }

    if (segment === "..") {
      stack.pop();
      continue;
    }

    stack.push(segment);
  }

  const prefix = drive ? `${drive}${separator}` : startsWithSeparator ? separator : "";
  return `${prefix}${stack.join(separator)}`;
}

function getFileExtension(path: string) {
  const cleanPath = cleanMarkdownResourceSource(path);
  const extension = /\.([^.\\/]+)$/.exec(cleanPath)?.[1];
  return extension?.toLowerCase() ?? "";
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

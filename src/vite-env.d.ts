/// <reference types="vite/client" />

declare module "*?url" {
  const src: string;
  export default src;
}

declare module "*?worker&url" {
  const src: string;
  export default src;
}

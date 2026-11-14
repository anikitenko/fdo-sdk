/** FDO's CSS loader exposes class definitions as SDK style maps. */
declare module '*.css' {
    const styles: Record<string, import('@anikitenko/fdo-sdk').DOMStyleMap>;
    export default styles;
}

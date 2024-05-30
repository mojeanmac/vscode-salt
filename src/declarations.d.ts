declare module "*.html" {
    const content: string;
    export default content;
}

declare module "vscode" {
    interface ThemableDecorationAttachmentRenderOptions {
        // TODO 2024 05 29 wd:
        // this is a possibly undocumented option (?)
        // that was present in revis's visualization code (image2decoration).
        // i'm not sure if it actually does anything (don't think i noticed anything when commenting it out),
        //  but just in case have left it in.
        // here we just make it a valid key so typescript doesn't complain, in case it does actually do something
        // (and generally speaking having extra keys doesn't usually break things).
        // i don't know what the type of it is supposed to be, so given it a defined literal string key (that which is used by revis), or any arbitrary string.
        // the `(string & {})` is a typescript trick to make the string literals in the union appear in autocomplete,
        //  since otherwise the literal and string union `"foo" | string` reduces down to just `string`.
        verticalAlign?: "text-top" | (string & {});
    }
}

declare type $TSFIXME = any
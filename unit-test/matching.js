"use strict";
const suggestions = [
    /consider adding a leading/,
    /consider dereferencing here/,
    /consider removing deref here/,
    /consider dereferencing/,
    /consider borrowing here/,
    /consider .+borrowing here/,
    /consider removing the/,
    /unboxing the value/,
    /dereferencing the borrow/,
    /dereferencing the type/,
];
const testStrings = [
    "consider removing the *",
    "consider &borrowing here"
];
testStrings.forEach((str) => {
    suggestions.forEach((suggestion) => {
        if (suggestion.test(str)) {
            console.log(`Matched: ${str} with ${suggestion}`);
        }
    });
});
//# sourceMappingURL=matching.js.map
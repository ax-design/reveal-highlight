export const extractRGBValue = (x: string) => {
    if (x === '') {
        return '';
    }

    if (x[0] === '#') {
        // Thanks bro:
        // https://stackoverflow.com/a/11508164/3931936
        const hexVal = parseInt(x.substring(1), 16);

        var r = (hexVal >> 16) & 255;
        var g = (hexVal >> 8) & 255;
        var b = hexVal & 255;

        return r + ',' + g + ',' + b;
    } else {
        let result = '';
        let beginSearch = false;
        let numberPointer = 0;

        for (let i = 0; i < x.length; i++) {
            const char = x[i];
            const charCode = char.charCodeAt(0) - 48;
            const charIsNumber = charCode >= 0 && charCode < 10;

            if (char === ' ') {
                continue;
            }

            if (beginSearch && !charIsNumber && char !== ',' && char !== ')') {
                throw new SyntaxError(`${x} is not a validate color value!`);
            }

            if (!beginSearch && char === '(') {
                beginSearch = true;
                continue;
            }

            if (numberPointer < 2 && char === ')') {
                throw new SyntaxError(`${x} should have at least three color channel`);
            }

            if (char === ',') {
                numberPointer++;
            }

            if (char === ')') {
                return result;
            }

            if (beginSearch) {
                result += char;
            }
        }

        return result;
    }
};

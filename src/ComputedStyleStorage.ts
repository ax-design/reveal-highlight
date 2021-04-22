import { config } from './config.js';

export interface ComputedStyleStorage {
    el: HTMLElement;
    size(): number;
    get(propertyName: string): string;
    getColor(propertyName: string): string;
    getNumber(propertyName: string): number;
}

class ComputedStyleCompat implements ComputedStyleStorage {
    protected static colorParser: HTMLDivElement;
    protected static colorParserStyle: CSSStyleDeclaration;

    el: HTMLElement;
    style: CSSStyleDeclaration;

    constructor(el: HTMLElement) {
        if (!ComputedStyleCompat.colorParser) {
            const el = document.createElement('div');
            el.style.display = 'none !important';
            document.body.appendChild(el);

            ComputedStyleCompat.colorParser = el;
            ComputedStyleCompat.colorParserStyle = window.getComputedStyle(el);
        }

        this.el = el;
        this.style = window.getComputedStyle(el);
    }

    size() {
        return this.style.length;
    }

    get(propertyName: string) {
        return this.style.getPropertyValue(propertyName).trim();
    }

    getColor(propertyName: string) {
        ComputedStyleCompat.colorParser.style.color = this.get(propertyName);
        return ComputedStyleCompat.colorParserStyle.color || 'rgb(0, 0, 0)';
    }

    getNumber(propertyName: string) {
        // Length values in computed style will always in the unit of px
        // Maybe NaN
        return parseFloat(this.get(propertyName));
    }
}

class ComputedStyleExperimental implements ComputedStyleStorage {
    el: HTMLElement;
    style: StylePropertyMap;

    constructor(el: HTMLElement) {
        this.el = el;
        this.style = el.computedStyleMap();
    }

    size() {
        return this.style.size;
    }

    get(propertyName: string) {
        return this.style.get(propertyName).toString();
    }

    getColor(propertyName: string) {
        return this.get(propertyName);
    }

    getNumber(propertyName: string) {
        const value = this.style.get(propertyName).value;
        if (typeof value === 'number') {
            // Length values in computed style will always in the unit of px
            return value;
        }

        // Maybe NaN
        return parseFloat(value as string);
    }
}

export function createStorage(el: HTMLElement): ComputedStyleStorage {
    return config.compat
        ? new ComputedStyleCompat(el)
        : new ComputedStyleExperimental(el);
}

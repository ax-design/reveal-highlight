<h1 align="center">
  <img src="https://raw.githubusercontent.com/ax-design/reveal-highlight-react/master/docs/logo.png" alt="Reveal Hightlight">
</h1>

<p>
  React component that impolement Reveal Highlight of Axiom Design System.
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/ax-design/reveal-highlight-react/master/docs/screen-record.gif" alt="Screenshot">
</p>

## Installation

```
// with npm
npm install @ax-design/reveal-highlight-react

// with yarn
yarn add @ax-design/reveal-highlight-react
```

## Usage

To add a reveal effect on your web application, you need to wrap a `RevealHighlight` component with `RevealHighlightProvider` and `RevealHighlightBoundary`.

`RevealHighlightProvider` will manage the global reveal style, and cache the rendered highlight bitmap for better performance (WIP).

`RevealHighlightBoundary` will manage the rendering behavior of `RevealHighlight` components, while your mouse enter the boundary, the highlight components will get started to rendering, while your mouse leave the boundary component, all highlight effect will disappear.

Say, we wrapped a button component:

```
interface ButtonProps {
  // Some magic here.
}

export Button: React.SFC<ButtonProps> = (props) => {
  return (
    <div>
      <button>
        <Reveal />
        {props.children}
      </button>
    </div>
  );
}
```

And, we'll use it in another component:

```
export interface AppProps {

}

const App: React.FC<AppProps> = () => {

  return (
    <RevealProvider>
      <RevealBoundary>
        <div>
          <Button>Hello</Button>
          <Button>World!</Button>
        </div>
      </RevealBoundary>
    </RevealProvider>
  );
}
```

## API Document

### `RevealHighlightProvider`

### `RevealHighlightBoundary`

#### Props

##### dynamicBoundingRect

**Type:** Boolean

**Default:** false

**Description:** If the boundary it self or it children contain scrolling element, please set this props to `true` for correct rendering result. While enabled `DynamicBoundingRect`, the reveal state manager will call `Element.getBoundingClientRect()` for each frame, which may impact the performance, so it's disabled by default.

#### `RevealHighlight`

##### color

**Type:** `string`

**Default:** `'0, 0, 0'`

**Description:**  The color of the reveal highlight. the string should contain color information in "RGB" format, sepererate by comma.

##### borderStyle

**Type:** `'full' | 'half' | 'none'`

**Default:** `'full'`

**Description:**  If `full` provided, there'll be four sides of the element will have light effect, if `half` provided, only top and bottom side will have light effect, `none` literally no border.

##### borderWidth

**Type:** number

**Default:** `1`

**Description:**  Border width in `px`.

##### fillMode

**Type:** `'relative' | 'absolute' | 'none'`

**Default:** `relative`

**Description:**  How the program calculating the radius of gradient, if `relative` provided, gradient radius will be:

* `r(border) = min(width, height) * fillRadius`
* `r(fill) = max(width, height) * fillRadius`

If `absolute` provided, gradient will be:

* `r(border) = fillRadius`
* `r(fill) = illRadius`

the unit is pixel.

If `none` provided, nothing will happen, you won't need this option.

##### fillRadius

**Type:** number

**Default:** `1.5`

**Description:**  Radius of the highlight gradient.

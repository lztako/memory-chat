declare module "react-simple-maps" {
  import * as React from "react"

  export interface ComposableMapProps {
    projection?: string
    projectionConfig?: Record<string, unknown>
    style?: React.CSSProperties
    height?: number
    width?: number
    children?: React.ReactNode
  }

  export interface ZoomableGroupProps {
    zoom?: number
    minZoom?: number
    maxZoom?: number
    children?: React.ReactNode
  }

  export interface GeographiesProps {
    geography: string
    children: (props: { geographies: Geography[] }) => React.ReactNode
  }

  export interface Geography {
    rsmKey: string
    id: string
    properties: Record<string, unknown>
  }

  export interface GeographyProps {
    geography: Geography
    fill?: string
    stroke?: string
    strokeWidth?: number
    style?: {
      default?: React.CSSProperties
      hover?: React.CSSProperties
      pressed?: React.CSSProperties
    }
    onMouseEnter?: (event: React.MouseEvent<SVGPathElement>) => void
    onMouseLeave?: (event: React.MouseEvent<SVGPathElement>) => void
    onClick?: (event: React.MouseEvent<SVGPathElement>) => void
    key?: string
  }

  export const ComposableMap: React.FC<ComposableMapProps>
  export const ZoomableGroup: React.FC<ZoomableGroupProps>
  export const Geographies: React.FC<GeographiesProps>
  export const Geography: React.FC<GeographyProps>
}

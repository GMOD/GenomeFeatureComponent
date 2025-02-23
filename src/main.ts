import * as d3 from 'd3'

import { setHighlights } from './RenderFunctions'
import { createLegendBox } from './services/LegenedService'

import IsoformAndVariantTrack from './tracks/IsoformAndVariantTrack'
import IsoformEmbeddedVariantTrack from './tracks/IsoformEmbeddedVariantTrack'
import IsoformTrack from './tracks/IsoformTrack'
import ReferenceTrack from './tracks/ReferenceTrack'
import { TRACK_TYPE } from './tracks/TrackTypeEnum'
import VariantTrack from './tracks/VariantTrack'
import VariantTrackGlobal from './tracks/VariantTrackGlobal'

import type { VariantFeature } from './services/VariantService'
import type { SimpleFeatureSerialized } from './services/types'

import './GenomeFeatureViewer.css'

interface Track {
  type: string
  label?: string
  id: string
  variantData?: VariantFeature[]
  trackData?: SimpleFeatureSerialized[]
}

interface Region {
  start: number
  end: number
  chromosome: string
}

interface ViewerConfig {
  locale: 'global' | 'local'
  tracks?: Track[]
  region: Region
  genome: string
  showVariantLabel?: boolean
  transcriptTypes?: string[]
  variantTypes?: string[]
  initialHighlight?: string[]
  isoformFilter?: string[]
  variantFilter?: string[]
  htpVariant?: string // Colin note: unsure??
  binRatio?: number
}

d3.selection.prototype.first = function () {
  return d3.select(this.nodes()[0])
}
d3.selection.prototype.last = function () {
  return d3.select(this.nodes()[this.size() - 1])
}

declare module 'd3' {
  interface Selection<
    GElement extends d3.BaseType,
    Datum,
    PElement extends d3.BaseType,
    PDatum,
  > {
    first(): Selection<GElement, Datum, PElement, PDatum>
    last(): Selection<GElement, Datum, PElement, PDatum>
  }
}

export default class GenomeFeatureViewer {
  public config: ViewerConfig
  public height: number
  public width: number
  public svg_target: string

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public viewer: d3.Selection<SVGGElement, unknown, HTMLElement | null, any>

  constructor(
    config: ViewerConfig,
    svg_target: string,
    width: number,
    height: number,
  ) {
    this.height = height
    this.width = width
    this.config = config
    this.svg_target = svg_target
    this.viewer = this._initViewer(svg_target)
    this.draw()
  }

  generateLegend() {
    return createLegendBox()
  }

  get tracks() {
    return this.config.tracks ?? []
  }

  get genome() {
    return this.config.genome
  }

  closeModal() {
    for (const tooltipDiv of document.getElementsByClassName('gfc-tooltip')) {
      ;(tooltipDiv as HTMLElement).style.visibility = 'hidden'
    }
  }

  setSelectedAlleles(selectedAlleles: string[], target: string): void {
    // remove highlights first
    const svgTarget = d3.select(target)
    svgTarget.selectAll('.highlight').remove()
    svgTarget
      .selectAll(
        '.variant-deletion,.variant-SNV,.variant-insertion,.variant-delins',
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((d: any) => d.selected)
      .style('stroke', null)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .datum((d: any) => {
        d.selected = 'false'
        return d
      })

    // @ts-expect-error
    setHighlights(selectedAlleles, svgTarget)
  }

  private _initViewer(svg_target: string) {
    d3.select(svg_target).selectAll('*').remove()
    const viewer = d3.select(svg_target)
    const svgClass = svg_target.replace('#', '')
    const mainViewClass = `${svgClass} main-view`

    if (this.config.locale === 'global') {
      const margin = {
        top: 8,
        right: 30,
        bottom: 30,
        left: 40,
      }
      viewer
        .attr('width', this.width)
        .attr('height', this.height)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`)
        .attr('class', mainViewClass)
      this.width = this.width - margin.left - margin.right
      this.height = this.height - margin.top - margin.bottom
    } else {
      // Different margins for a local view. (Maybe we can make these match at
      // some point)
      const margin = {
        top: 10,
        bottom: 10,
      }
      viewer
        .attr('width', this.width)
        .attr('height', this.height)
        .append('g')
        .attr('class', mainViewClass)
      this.height = this.height - margin.top - margin.bottom
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return d3.select<SVGGElement, any>(`${svg_target} .main-view`)
  }

  getTracks(defaultTrack?: boolean): Track | Track[] {
    return !defaultTrack ? this.tracks : this.tracks[0]
  }

  draw() {
    const width = this.width
    const transcriptTypes = this.config.transcriptTypes ?? [
      'mRNA',
      'ncRNA',
      'piRNA',
      'lincRNA',
      'miRNA',
      'pre_miRNA',
      'snoRNA',
      'lnc_RNA',
      'tRNA',
      'snRNA',
      'rRNA',
      'ARS',
      'antisense_RNA',
      'C_gene_segment',
      'V_gene_segment',
      'pseudogene_attribute',
      'snoRNA_gene',
      'polypeptide_region',
      'mature_protein_region',
    ]
    const variantTypes = this.config.variantTypes ?? [
      'point_mutation',
      'MNV',
      'Deletion',
      'Insertion',
      'Delins',
    ]
    const binRatio = this.config.binRatio ?? 0.01

    const options = this.config
    // Sequence information
    const sequenceOptions = this._configureRange(
      options.region.start,
      options.region.end,
      width,
    )
    const range = sequenceOptions.range
    const chromosome = options.region.chromosome
    const variantFilter = options.variantFilter ?? []
    const isoformFilter = options.isoformFilter ?? []
    const initialHighlight = options.initialHighlight ?? []
    const htpVariant = options.htpVariant ?? ''
    const start = sequenceOptions.start
    const end = sequenceOptions.end

    const referenceTrack = new ReferenceTrack({
      viewer: this.viewer,
      track: {
        chromosome,
        start,
        end,
        range: sequenceOptions.range,
      },
      height: this.height,
      width,
    })

    referenceTrack.DrawOverviewTrack()

    const LABEL_OFFSET = 100
    let trackHeight = LABEL_OFFSET

    const showVariantLabel = true
    const { viewer, genome, height, tracks } = this
    const region = { start, end, chromosome }
    Promise.all(
      tracks.map(async track => {
        const { variantData, trackData } = track

        if (track.type === TRACK_TYPE.ISOFORM_AND_VARIANT) {
          const isoformVariantTrack = new IsoformAndVariantTrack({
            region,
            viewer,
            height,
            width,
            transcriptTypes,
            variantTypes,
            showVariantLabel,
            trackData,
            variantData,
            variantFilter,
            binRatio,
            isoformFilter,
          })
          trackHeight += isoformVariantTrack.DrawTrack()
        } else if (track.type === TRACK_TYPE.ISOFORM_EMBEDDED_VARIANT) {
          const isoformVariantTrack = new IsoformEmbeddedVariantTrack({
            viewer,
            height,
            width,
            transcriptTypes,
            variantData,
            trackData,
            variantTypes,
            showVariantLabel,
            variantFilter,
          })
          trackHeight += isoformVariantTrack.DrawTrack()
        } else if (track.type === TRACK_TYPE.ISOFORM) {
          const isoformTrack = new IsoformTrack({
            region,
            viewer,
            height,
            width,
            genome,
            trackData,
            transcriptTypes,
            htpVariant,
          })
          trackHeight += isoformTrack.DrawTrack()
        } else if (track.type === TRACK_TYPE.VARIANT) {
          const variantTrack = new VariantTrack({
            region,
            viewer,
            range,
            height,
            width,
          })
          await variantTrack.getTrackData()
          variantTrack.DrawTrack()
        } else if (track.type === TRACK_TYPE.VARIANT_GLOBAL) {
          const variantTrack = new VariantTrackGlobal({
            region,
            viewer,
            track: {
              ...track,
              range,
            },
            height,
            width,
          })
          await variantTrack.getTrackData()
          variantTrack.DrawTrack()
        } else {
          console.error(`TrackType not found for ${track.id}...`, track.type)
        }
        d3.select(this.svg_target).attr('height', trackHeight)
      }),
    ).catch((e: unknown) => {
      console.error(e)
    })
  }

  // Configure the range for our tracks two use cases
  //    1. Entered with a position
  //    2. TODO: Entered with a range start at 0?
  //    3. Are we in overview or scrollable?
  _configureRange(
    start: number,
    end: number,
    width: number,
  ): { start: number; end: number; range: [number, number] } {
    let sequenceLength = null
    const desiredScaling = 17 // most optimal for ~50bp in the view.
    let rangeWidth = 0
    let range: [number, number] = [0, 0]

    // We have entered with a variant position
    // create our sequence 'padding'
    // ex. position 20, we want total 100 nucelotides
    // (20 - 49) & (50 + 20)
    // definitely in scrollable
    if (start === end) {
      sequenceLength = 300 // hardcode 150 to each end.
      rangeWidth = desiredScaling * sequenceLength
      start = start - sequenceLength / 2 - 1
      end = end + sequenceLength / 2

      // Plus 100 for the label offset.
      const middleOfView =
        // @ts-expect-error
        d3.select('#clip-rect').node()!.getBoundingClientRect().width / 2 + 100

      range = [
        middleOfView - rangeWidth / 2,
        middleOfView + rangeWidth / 2,
      ] as const
    } else {
      // This statement will not work with scrollable setting and a defined range
      // TODO: FIX THIS
      return {
        range: [0, width] as const,
        start: start,
        end: end,
      }
    }

    return {
      range,
      start,
      end,
    }
  }
}

export { fetchNCListData } from './NCListFetcher'

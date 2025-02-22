import * as d3 from 'd3'

import {
  calculateNewTrackPosition,
  checkSpace,
  findRange,
} from '../RenderFunctions'
import { ApolloService } from '../services/ApolloService'
import { renderTrackDescription } from '../services/TrackService'
import {
  generateVariantBins,
  generateVariantDataBinsAndDataSets,
  getColorsForConsequences,
  getVariantDescriptions,
  getVariantSymbol,
  renderVariantDescriptions,
} from '../services/VariantService'

import type { VariantFeature } from '../services/VariantService'
import type { SimpleFeatureSerialized } from '../services/types'

interface IsoformEmbeddedVariantTrackProps {
  viewer: d3.Selection<SVGGElement, unknown, null, undefined>
  height: number
  width: number
  transcriptTypes: string[]
  variantTypes: string[]
  showVariantLabel?: boolean
  variantFilter: string[]
  service?: ApolloService
}

const apolloService = new ApolloService()

export default class IsoformEmbeddedVariantTrack {
  private trackData: SimpleFeatureSerialized[] = []
  private variantData: VariantFeature[] = []
  private viewer: d3.Selection<SVGGElement, unknown, null, undefined>
  private width: number
  private variantFilter: string[]
  private height: number
  private transcriptTypes: string[]
  private variantTypes: string[]
  private showVariantLabel: boolean
  private service: ApolloService

  constructor({
    viewer,
    height,
    width,
    transcriptTypes,
    variantTypes,
    showVariantLabel,
    variantFilter,
    service,
  }: IsoformEmbeddedVariantTrackProps) {
    this.viewer = viewer
    this.width = width
    this.variantFilter = variantFilter
    this.height = height
    this.transcriptTypes = transcriptTypes
    this.variantTypes = variantTypes
    this.showVariantLabel = showVariantLabel ?? true
    this.service = service ?? apolloService
  }

  // Draw our track on the viewer
  // TODO: Potentially seperate this large section of code
  // for both testing/extensibility
  DrawTrack() {
    let isoformData = this.trackData
    const variantData = this.filterVariantData(
      this.variantData,
      this.variantFilter,
    )
    const viewer = this.viewer
    const width = this.width
    const showVariantLabel = this.showVariantLabel

    // TODO: make configurable and a const / default
    const MAX_ROWS = 10

    const UTR_feats = ['UTR', 'five_prime_UTR', 'three_prime_UTR']
    const CDS_feats = ['CDS']
    const exon_feats = ['exon']
    const display_feats = this.transcriptTypes
    const dataRange = findRange(isoformData, display_feats)

    const view_start = dataRange.fmin
    const view_end = dataRange.fmax

    // constants
    const EXON_HEIGHT = 10 // will be white / transparent
    const CDS_HEIGHT = 10 // will be colored in
    const ISOFORM_HEIGHT = 40 // height for each isoform
    const GENE_LABEL_HEIGHT = 20
    const MIN_WIDTH = 2
    const ISOFORM_TITLE_HEIGHT = 0 // height for each isoform
    const UTR_HEIGHT = 10 // this is the height of the isoform running all of the way through
    const VARIANT_HEIGHT = 10 // this is the height of the isoform running all of the way through
    const VARIANT_OFFSET = 20 // this is the height of the isoform running all of the way through
    const TRANSCRIPT_BACKBONE_HEIGHT = 4 // this is the height of the isoform running all of the way thro>
    const ARROW_HEIGHT = 20
    const ARROW_WIDTH = 10
    const ARROW_POINTS = `0,0 0,${ARROW_HEIGHT} ${ARROW_WIDTH},${ARROW_WIDTH}`
    const SNV_HEIGHT = 10
    const SNV_WIDTH = 10
    const insertion_points = (x: number) => {
      return `${x - SNV_WIDTH / 2},${SNV_HEIGHT} ${x},0 ${x + SNV_WIDTH / 2},${SNV_HEIGHT}`
    }

    const delins_points = (x: number) => {
      return `${x - SNV_WIDTH / 2},${SNV_HEIGHT} ${x + SNV_WIDTH / 2},${SNV_HEIGHT} ${x - SNV_WIDTH / 2},0 ${x + SNV_WIDTH / 2},0`
    }

    const snv_points = (x: number) => {
      return `${x},${SNV_HEIGHT} ${x + SNV_WIDTH / 2},${SNV_HEIGHT / 2} ${x},0 ${x - SNV_WIDTH / 2},${SNV_HEIGHT / 2}`
    }

    const x = d3.scaleLinear().domain([view_start, view_end]).range([0, width])

    const newTrackPosition = calculateNewTrackPosition(this.viewer)
    const track = viewer
      .append('g')
      .attr('transform', `translate(0,${newTrackPosition})`)
      .attr('class', 'track')

    const sortWeight: Record<string, number> = {}
    for (const feat of UTR_feats) {
      sortWeight[feat] = 200
    }
    for (const feat of CDS_feats) {
      sortWeight[feat] = 1000
    }
    for (const feat of exon_feats) {
      sortWeight[feat] = 100
    }

    const geneList: Record<string, string> = {}

    isoformData = isoformData.sort((a, b) => {
      if (a.selected && !b.selected) {
        return -1
      }
      if (!a.selected && b.selected) {
        return 1
      }
      // @ts-expect-error
      return a.name - b.name
    })

    let heightBuffer = 0

    const tooltipDiv = d3
      .select('body')
      .append('div')
      .attr('class', 'gfc-tooltip')
      .style('visibility', 'visible')
      .style('opacity', 0)

    const closeToolTip = () => {
      tooltipDiv
        .transition()
        .duration(100)
        .style('opacity', 10)
        .style('visibility', 'hidden')
    }

    let row_count = 0
    const used_space: string[][] = []
    let fmin_display = -1
    let fmax_display = -1

    // eslint-disable-next-line @typescript-eslint/unbound-method
    const renderTooltipDescription = this.renderTooltipDescription

    // **************************************
    // FOR NOW LETS FOCUS ON ONE GENE ISOFORM
    // **************************************
    //
    // let feature = data[0];
    for (let i = 0; i < isoformData.length && row_count < MAX_ROWS; i++) {
      const feature = isoformData[i]
      let featureChildren = feature.children
      if (featureChildren) {
        const selected = feature.selected

        // May want to remove this and add an external sort function
        // outside of the render method to put certain features on top.
        featureChildren = featureChildren.sort((a, b) => {
          if (a.name < b.name) {
            return -1
          }
          if (a.name > b.name) {
            return 1
          }
          // @ts-expect-error
          return a - b
        })

        // For each isoform..
        let warningRendered = false
        featureChildren.forEach(featureChild => {
          const featureType = featureChild.type

          if (display_feats.includes(featureType)) {
            // function to assign row based on available space.
            // *** DANGER EDGE CASE ***/
            let current_row = checkSpace(
              used_space,
              x(featureChild.fmin),
              x(featureChild.fmax),
            )
            if (row_count < MAX_ROWS) {
              // An isoform container
              let text_string
              let text_label
              let addingGeneLabel = false
              if (!Object.keys(geneList).includes(feature.name)) {
                heightBuffer += GENE_LABEL_HEIGHT
                addingGeneLabel = true
                geneList[feature.name] = 'Green'
              }

              const isoform = track
                .append('g')
                .attr('class', 'isoform')
                .attr(
                  'transform',
                  `translate(0,${row_count * ISOFORM_HEIGHT + 10 + heightBuffer})`,
                )
              if (addingGeneLabel) {
                text_string = feature.name
                text_label = isoform
                  .append('text')
                  .attr('class', 'geneLabel')
                  .attr('fill', selected ? 'sandybrown' : 'black')
                  .attr('height', ISOFORM_TITLE_HEIGHT)
                  .attr(
                    'transform',
                    `translate(${x(featureChild.fmin)},-${GENE_LABEL_HEIGHT})`,
                  )
                  .text(text_string)
                  .on('click', () => {
                    renderTooltipDescription(
                      tooltipDiv,
                      renderTrackDescription(feature),
                      closeToolTip,
                    )
                  })
                  .datum({ fmin: featureChild.fmin })
              }

              isoform
                .append('polygon')
                .datum(() => ({
                  fmin: featureChild.fmin,
                  fmax: featureChild.fmax,
                  strand: feature.strand,
                }))
                .attr('class', 'transArrow')
                .attr('points', ARROW_POINTS)
                .attr('transform', d => {
                  return feature.strand > 0
                    ? `translate(${Number(x(d.fmax))},0)`
                    : `translate(${Number(x(d.fmin))},${ARROW_HEIGHT}) rotate(180)`
                })
                .on('click', () => {
                  renderTooltipDescription(
                    tooltipDiv,
                    renderTrackDescription(featureChild),
                    closeToolTip,
                  )
                })

              isoform
                .append('rect')
                .attr('class', 'transcriptBackbone')
                .attr('y', 10 + ISOFORM_TITLE_HEIGHT)
                .attr('height', TRANSCRIPT_BACKBONE_HEIGHT)
                .attr('transform', `translate(${x(featureChild.fmin)},0)`)
                .attr('width', x(featureChild.fmax) - x(featureChild.fmin))
                .on('click', () => {
                  renderTooltipDescription(
                    tooltipDiv,
                    renderTrackDescription(featureChild),
                    closeToolTip,
                  )
                })
                .datum({ fmin: featureChild.fmin, fmax: featureChild.fmax })

              text_string = featureChild.name
              text_label = isoform
                .append('text')
                .attr('class', 'transcriptLabel')
                .attr('fill', selected ? 'sandybrown' : 'gray')
                .attr('opacity', selected ? 1 : 0.5)
                .attr('height', ISOFORM_TITLE_HEIGHT)
                .attr('transform', `translate(${x(featureChild.fmin)},0)`)
                .text(text_string)
                .on('click', () => {
                  renderTooltipDescription(
                    tooltipDiv,
                    renderTrackDescription(featureChild),
                    closeToolTip,
                  )
                })
                .datum({ fmin: featureChild.fmin })

              // Now that the label has been created we can calculate the space that
              // this new element is taking up making sure to add in the width of
              // the box.
              // TODO: this is just an estimate of the length
              let text_width = text_string.length * 2

              // not some instances (as in reactjs?) the bounding box isn't available, so we have to guess
              try {
                // @ts-expect-error
                text_width = text_label.node().getBBox().width
              } catch (e) {
                // console.error('Not yet rendered',e)
              }
              // First check to see if label goes past the end
              if (Number(text_width + x(featureChild.fmin)) > width) {
                // console.error(featureChild.name + " goes over the edge");
              }
              const feat_end =
                text_width > x(featureChild.fmax) - x(featureChild.fmin)
                  ? x(featureChild.fmin) + text_width
                  : x(featureChild.fmax)

              // This is probably not the most efficent way to do this.
              // Making an 2d array... each row is the first array (no zer0)
              // next level is each element taking up space.
              // Also using colons as spacers seems very perl... maybe change that?
              // *** DANGER EDGE CASE ***/
              if (used_space[current_row]) {
                const temp = used_space[current_row]
                temp.push(`${x(featureChild.fmin)}:${feat_end}`)
                used_space[current_row] = temp
              } else {
                used_space[current_row] = [
                  `${x(featureChild.fmin)}:${feat_end}`,
                ]
              }

              // Now check on bounds since this feature is displayed
              // The true end of display is converted to bp.
              if (fmin_display < 0 || fmin_display > featureChild.fmin) {
                fmin_display = featureChild.fmin
              }
              if (fmax_display < 0 || fmax_display < featureChild.fmax) {
                fmax_display = featureChild.fmax
              }

              // have to sort this so we draw the exons BEFORE the CDS
              if (featureChild.children) {
                featureChild.children = featureChild.children.sort((a, b) => {
                  const sortAValue = sortWeight[a.type]
                  const sortBValue = sortWeight[b.type]

                  if (
                    typeof sortAValue === 'number' &&
                    typeof sortBValue === 'number'
                  ) {
                    return sortAValue - sortBValue
                  }
                  if (
                    typeof sortAValue === 'number' &&
                    typeof sortBValue !== 'number'
                  ) {
                    return -1
                  }
                  if (
                    typeof sortAValue !== 'number' &&
                    typeof sortBValue === 'number'
                  ) {
                    return 1
                  }
                  // NOTE: type not found and weighted
                  // @ts-expect-error
                  return a.type - b.type
                })

                featureChild.children.forEach(innerChild => {
                  const innerType = innerChild.type

                  let validInnerType = false
                  if (exon_feats.includes(innerType)) {
                    validInnerType = true
                    isoform
                      .append('rect')
                      .attr('class', 'exon')
                      .attr('x', x(innerChild.fmin))
                      .attr(
                        'transform',
                        `translate(0,${EXON_HEIGHT - TRANSCRIPT_BACKBONE_HEIGHT})`,
                      )
                      .attr('height', EXON_HEIGHT)
                      .attr('z-index', 10)
                      .attr('width', x(innerChild.fmax) - x(innerChild.fmin))
                      .on('click', () => {
                        renderTooltipDescription(
                          tooltipDiv,
                          renderTrackDescription(featureChild),
                          closeToolTip,
                        )
                      })
                      .datum({ fmin: innerChild.fmin, fmax: innerChild.fmax })
                  } else if (CDS_feats.includes(innerType)) {
                    validInnerType = true
                    isoform
                      .append('rect')
                      .attr('class', 'CDS')
                      .attr('x', x(innerChild.fmin))
                      .attr(
                        'transform',
                        `translate(0,${CDS_HEIGHT - TRANSCRIPT_BACKBONE_HEIGHT})`,
                      )
                      .attr('z-index', 20)
                      .attr('height', CDS_HEIGHT)
                      .attr('width', x(innerChild.fmax) - x(innerChild.fmin))
                      .on('click', () => {
                        renderTooltipDescription(
                          tooltipDiv,
                          renderTrackDescription(featureChild),
                          closeToolTip,
                        )
                      })
                      .datum({ fmin: innerChild.fmin, fmax: innerChild.fmax })
                  } else if (UTR_feats.includes(innerType)) {
                    validInnerType = true
                    isoform
                      .append('rect')
                      .attr('class', 'UTR')
                      .attr('x', x(innerChild.fmin))
                      .attr(
                        'transform',
                        `translate(0,${UTR_HEIGHT - TRANSCRIPT_BACKBONE_HEIGHT})`,
                      )
                      .attr('z-index', 20)
                      .attr('height', UTR_HEIGHT)
                      .attr('width', x(innerChild.fmax) - x(innerChild.fmin))
                      .on('click', () => {
                        renderTooltipDescription(
                          tooltipDiv,
                          renderTrackDescription(featureChild),
                          closeToolTip,
                        )
                      })
                      .datum({ fmin: innerChild.fmin, fmax: innerChild.fmax })
                  }
                  if (validInnerType) {
                    const variantBins = generateVariantDataBinsAndDataSets(
                      variantData,
                      // NOTE: made up value
                      1,
                    )
                    // TODO: remove this once no longer needed
                    generateVariantBins(variantData)

                    // 12 if all have 1
                    variantBins.forEach(variant => {
                      const { type, fmax, fmin } = variant
                      if (
                        (fmin < innerChild.fmin && fmax > innerChild.fmin) ||
                        (fmax > innerChild.fmax && fmin < innerChild.fmax) ||
                        (fmax <= innerChild.fmax && fmin >= innerChild.fmin)
                      ) {
                        let drawnVariant = true
                        const descriptions = getVariantDescriptions(variant)
                        // const consequence = description.consequence ? description.consequence : "UNKNOWN";
                        const consequenceColor =
                          getColorsForConsequences(descriptions)[0]
                        const descriptionHtml =
                          renderVariantDescriptions(descriptions)
                        const width = Math.max(
                          Math.ceil(x(fmax) - x(fmin)),
                          MIN_WIDTH,
                        )
                        if (
                          type.toLowerCase() === 'deletion' ||
                          type.toLowerCase() === 'mnv'
                        ) {
                          isoform
                            .append('rect')
                            .attr('class', 'variant-deletion')
                            .attr('x', x(fmin))
                            .attr(
                              'transform',
                              `translate(0,${VARIANT_OFFSET - TRANSCRIPT_BACKBONE_HEIGHT})`,
                            )
                            .attr('z-index', 30)
                            .attr('fill', consequenceColor)
                            .attr('height', VARIANT_HEIGHT)
                            .attr('width', width)
                            .on('click', () => {
                              renderTooltipDescription(
                                tooltipDiv,
                                descriptionHtml,
                                closeToolTip,
                              )
                            })
                            .datum({ fmin: fmin, fmax: fmax })
                        } else if (
                          type.toLowerCase() === 'snv' ||
                          type.toLowerCase() === 'point_mutation'
                        ) {
                          isoform
                            .append('polygon')
                            .attr('class', 'variant-SNV')
                            .attr('points', snv_points(x(fmin)))
                            .attr('fill', consequenceColor)
                            .attr('x', x(fmin))
                            .attr(
                              'transform',
                              `translate(0,${VARIANT_OFFSET - TRANSCRIPT_BACKBONE_HEIGHT})`,
                            )
                            .attr('z-index', 30)
                            .on('click', () => {
                              renderTooltipDescription(
                                tooltipDiv,
                                descriptionHtml,
                                closeToolTip,
                              )
                            })
                            .datum({ fmin: fmin, fmax: fmax })
                        } else if (type.toLowerCase() === 'insertion') {
                          isoform
                            .append('polygon')
                            .attr('class', 'variant-insertion')
                            .attr('points', insertion_points(x(fmin)))
                            .attr('fill', consequenceColor)
                            .attr('x', x(fmin))
                            .attr(
                              'transform',
                              `translate(0,${VARIANT_OFFSET - TRANSCRIPT_BACKBONE_HEIGHT})`,
                            )
                            .attr('z-index', 30)
                            .on('click', () => {
                              renderTooltipDescription(
                                tooltipDiv,
                                descriptionHtml,
                                closeToolTip,
                              )
                            })
                            .datum({ fmin: fmin, fmax: fmax })
                        } else if (
                          type.toLowerCase() === 'delins' ||
                          type.toLowerCase() === 'substitution' ||
                          type.toLowerCase() === 'indel'
                        ) {
                          isoform
                            .append('polygon')
                            .attr('class', 'variant-delins')
                            .attr('points', delins_points(x(fmin)))
                            .attr('x', x(fmin))
                            .attr(
                              'transform',
                              `translate(0,${VARIANT_OFFSET - TRANSCRIPT_BACKBONE_HEIGHT})`,
                            )
                            .attr('fill', consequenceColor)
                            .attr('z-index', 30)
                            .on('click', () => {
                              renderTooltipDescription(
                                tooltipDiv,
                                descriptionHtml,
                                closeToolTip,
                              )
                            })
                            .datum({ fmin: fmin, fmax: fmax })
                        } else {
                          console.warn('type not found', type, variant)
                          drawnVariant = false
                        }
                        if (drawnVariant && showVariantLabel) {
                          const symbol_string = getVariantSymbol(variant)
                          const symbol_string_length = symbol_string.length || 1
                          isoform
                            .append('text')
                            .attr('class', 'variantLabel')
                            .attr(
                              'fill',
                              selected ? 'sandybrown' : consequenceColor,
                            )
                            .attr('opacity', selected ? 1 : 0.5)
                            .attr('height', ISOFORM_TITLE_HEIGHT)
                            .attr(
                              'transform',
                              `translate(${x(fmin - (symbol_string_length / 2) * 100)},${VARIANT_OFFSET * 2.2 - TRANSCRIPT_BACKBONE_HEIGHT})`,
                            )
                            .html(symbol_string)
                            .on('click', () => {
                              renderTooltipDescription(
                                tooltipDiv,
                                descriptionHtml,
                                closeToolTip,
                              )
                            })
                            .datum({ fmin: featureChild.fmin })
                        }
                      }
                    })
                  }
                })
              }
              row_count += 1
            }
            if (row_count === MAX_ROWS && !warningRendered) {
              // *** DANGER EDGE CASE ***/
              ++current_row
              warningRendered = true
              // let isoform = track.append("g").attr("class", "isoform")
              //     .attr("transform", "translate(0," + ((row_count * isoform_height) + 10) + ")")
              track
                .append('a')
                .attr('class', 'transcriptLabel')
                .attr('xlink:show', 'new')
                .append('text')
                .attr('x', 10)
                .attr('y', 10)
                .attr(
                  'transform',
                  `translate(0,${row_count * ISOFORM_HEIGHT + 20 + heightBuffer})`,
                )
                .attr('fill', 'red')
                .attr('opacity', 1)
                .attr('height', ISOFORM_TITLE_HEIGHT)
                .text('Maximum features displayed.  See full view for more.')
            }
          }
        })
      }
    }

    if (row_count === 0) {
      track
        .append('text')
        .attr('x', 30)
        .attr('y', ISOFORM_TITLE_HEIGHT + 10)
        .attr('fill', 'orange')
        .attr('opacity', 0.6)
        .text(
          'Overview of non-coding genome features unavailable at this time.',
        )
    }
    // we return the appropriate height function
    return row_count * ISOFORM_HEIGHT + heightBuffer
  }
  private filterVariantData(
    variantData: VariantFeature[],
    variantFilter: string[],
  ): VariantFeature[] {
    if (variantFilter.length === 0) {
      return variantData
    }
    return variantData.filter(v => variantFilter.includes(v.name))
  }

  private renderTooltipDescription(
    tooltipDiv: d3.Selection<
      HTMLDivElement,
      unknown,
      HTMLElement | null,
      undefined
    >,
    descriptionHtml: string,
    closeFunction: () => void,
  ): void {
    tooltipDiv
      .transition()
      .duration(200)
      .style('width', 'auto')
      .style('height', 'auto')
      .style('opacity', 1)
      .style('visibility', 'visible')

    tooltipDiv
      .html(descriptionHtml)
      // @ts-expect-error
      .style('left', `${window.event!.pageX + 10}px`)
      // @ts-expect-error
      .style('top', `${window.event!.pageY + 10}px`)
      .append('button')
      .attr('type', 'button')
      .text('Close')
      .on('click', () => {
        closeFunction()
      })

    tooltipDiv
      .append('button')
      .attr('type', 'button')
      .html('&times;')
      .attr('class', 'tooltipDivX')
      .on('click', () => {
        closeFunction()
      })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async populateTrack(track: any) {
    await this.getTrackData(track)
    await this.getVariantData(track)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async getTrackData(track: any) {
    this.trackData = await this.service.fetchDataFromUrl(track, 'isoform_url')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async getVariantData(track: any) {
    this.variantData = await this.service.fetchDataFromUrl(track, 'variant_url')
  }
}

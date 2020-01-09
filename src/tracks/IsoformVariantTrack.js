import * as d3 from "d3";
import {calculateNewTrackPosition, checkSpace, findRange} from '../RenderFunctions';
import {
  getVariantDescription,
  getVariantSymbol,
  renderVariantDescription
} from "../services/VariantService";
import {getColorForConsequence} from "../services/ConsequenceService";
import {renderTrackDescription} from "../services/TrackService";
// import {description} from "d3/dist/package";

export default class IsoformVariantTrack {

  constructor(viewer, track, height, width, transcriptTypes, variantTypes,showVariantLabel) {
    this.trackData = {};
    this.variantData = {};
    this.viewer = viewer;
    this.width = width;
    this.height = height;
    this.transcriptTypes = transcriptTypes;
    this.variantTypes = variantTypes;
    this.showVariantLabel = showVariantLabel!==undefined ? showVariantLabel : true ;
  }

  // Draw our track on the viewer
  // TODO: Potentially seperate this large section of code
  // for both testing/extensibility
  DrawTrack() {
    let isoformData = this.trackData;
    let variantData = this.variantData;
    let viewer = this.viewer;
    let width = this.width;
    let showVariantLabel = this.showVariantLabel;

    // TODO: make configurable and a const / default
    let MAX_ROWS = 10;

    let UTR_feats = ["UTR", "five_prime_UTR", "three_prime_UTR"];
    let CDS_feats = ["CDS"];
    let exon_feats = ["exon"];
    let display_feats = this.transcriptTypes;
    let dataRange = findRange(isoformData, display_feats);

    let view_start = dataRange.fmin;
    let view_end = dataRange.fmax;
    let exon_height = 10; // will be white / transparent
    let cds_height = 10; // will be colored in
    let isoform_height = 40; // height for each isoform
    const geneLabelHeight = 20 ;
    let isoform_title_height = 0; // height for each isoform
    let utr_height = 10; // this is the height of the isoform running all of the way through
    let variant_height = 10; // this is the height of the isoform running all of the way through
    let variant_offset = 20; // this is the height of the isoform running all of the way through
    let transcript_backbone_height = 4; // this is the height of the isoform running all of the way through
    let arrow_height = 20;
    let arrow_width = 10;
    let arrow_points = '0,0 0,' + arrow_height + ' ' + arrow_width + ',' + arrow_width;
    let snv_height = 10;
    let snv_width = 10;

    const insertion_points = (x) => {
      return `${x-(snv_width/2.0)},${snv_height} ${x},0 ${x+(snv_width/2.0)},${snv_height}`;
    };

    const delins_points = (x) => {
      // const delins_strings = `${x-(snv_width/2.0)},${snv_height} ${x},0 ${x+(snv_width/2.0)},${snv_height}`;
      const delins_strings = `${x-(snv_width/2.0)},${snv_height} ${x+(snv_width/2.0)},${snv_height} ${x-(snv_width/2.0)},${0} ${x+(snv_width/2.0)},${0}`;
      return delins_strings;
    };

    const snv_points = (x) => {
      return `${x},${snv_height} ${x+(snv_width/2.0)},${snv_height/2.0} ${x},${0} ${x-(snv_width/2.0)},${snv_height/2.0}`;
    };

    let x = d3.scaleLinear()
      .domain([view_start, view_end])
      .range([0, width]);

    // Calculate where this track should go and translate it
    let newTrackPosition = calculateNewTrackPosition(this.viewer);
    let track = viewer.append("g").attr('transform', 'translate(0,' + newTrackPosition + ')').attr("class", "track");


    //need to build a new sortWeight since these can be dynamic
    let sortWeight = {};
    for (let i = 0, len = UTR_feats.length; i < len; i++) {
      sortWeight[UTR_feats[i]] = 200;
    }
    for (let i = 0, len = CDS_feats.length; i < len; i++) {
      sortWeight[CDS_feats[i]] = 1000;
    }
    for (let i = 0, len = exon_feats.length; i < len; i++) {
      sortWeight[exon_feats[i]] = 100;
    }

    let geneList = {};

    isoformData = isoformData.sort(function (a, b) {
      if (a.selected && !b.selected) return -1;
      if (!a.selected && b.selected) return 1;
      return a.name - b.name;
    });

    let heightBuffer = 0 ;

    let tooltipDiv = d3.select("body").append("div")
      .attr("class", "tooltip")
      .attr("id", "tooltip")
      .style("opacity", 0);

    const closeToolTip = () => {
        tooltipDiv.transition()
          .duration(100)
          .style("opacity", 0);
    };

    let row_count = 0;
    let used_space = [];
    let fmin_display = -1;
    let fmax_display = -1;
    // **************************************
    // FOR NOW LETS FOCUS ON ONE GENE ISOFORM
    // **************************************
    // let feature = data[0];
    for (let i = 0; i < isoformData.length && row_count < MAX_ROWS; i++) {
      let feature = isoformData[i];
      let featureChildren = feature.children;
      if (featureChildren) {

        let selected = feature.selected;

        //May want to remove this and add an external sort function
        //outside of the render method to put certain features on top.
        featureChildren = featureChildren.sort(function (a, b) {
          if (a.name < b.name) return -1;
          if (a.name > b.name) return 1;
          return a - b;
        });


        // For each isoform..
        let warningRendered = false ;
        featureChildren.forEach(function (featureChild) {
          //
          let featureType = featureChild.type;

          if (display_feats.indexOf(featureType) >= 0) {
            //function to assign row based on available space.
            // *** DANGER EDGE CASE ***/
            let current_row = checkSpace(used_space, x(featureChild.fmin), x(featureChild.fmax));
            if (row_count < MAX_ROWS) {
              // An isoform container

              let text_string, text_label;
              let addingGeneLabel = false ;
              if(Object.keys(geneList).indexOf(feature.name)<0) {
                heightBuffer += geneLabelHeight ;
                addingGeneLabel = true ;
                geneList[feature.name] = 'Green';
              }

              // console.log(featureChild)

              let isoform = track.append("g").attr("class", "isoform")
                .attr("transform", "translate(0," + ((row_count * isoform_height) + 10 + heightBuffer) + ")")
              ;

              if(addingGeneLabel){
                text_string = feature.name;
                // console.log('feature',feature)
                text_label = isoform.append('text')
                  .attr('class', 'geneLabel')
                  .attr('fill', selected ? 'sandybrown' : 'black')
                  .attr('height', isoform_title_height)
                  .attr("transform", "translate(" + x(featureChild.fmin) + `,-${geneLabelHeight})`)
                  .text(text_string)
                  .on("click", d => {
                    tooltipDiv.transition()
                      .duration(200)
                      .style("width", 'auto')
                      .style("height", 'auto')
                      .style("opacity", .9);
                    tooltipDiv.html(renderTrackDescription(feature))
                      .style("left", (d3.event.pageX+10) + "px")
                      .style("top", (d3.event.pageY +10) + "px")
                      .append('button')
                      .attr("type","button")
                      .text('Close')
                      .on('click', d => closeToolTip())
                  })
                  .datum({fmin: featureChild.fmin});
              }

              isoform.append("polygon")
                .datum(function () {
                  return {fmin: featureChild.fmin, fmax: featureChild.fmax, strand: feature.strand};
                })
                .attr('class', 'transArrow')
                .attr('points', arrow_points)
                .attr('transform', function (d) {
                  if (feature.strand > 0) {
                    return 'translate(' + Number(x(d.fmax)) + ',0)';
                  } else {
                    return 'translate(' + Number(x(d.fmin)) + ',' + arrow_height + ') rotate(180)';
                  }
                })
                .on("click", d => {
                  tooltipDiv.transition()
                    .duration(200)
                    .style("width", 'auto')
                    .style("height", 'auto')
                    .style("opacity", .9);
                  tooltipDiv.html(renderTrackDescription(featureChild))
                    .style("left", (d3.event.pageX+10) + "px")
                    .style("top", (d3.event.pageY +10) + "px")
                    .append('button')
                    .attr("type","button")
                    .text('Close')
                    .on('click', d => closeToolTip())
                })
              ;

              isoform.append('rect')
                .attr('class', 'transcriptBackbone')
                .attr('y', 10 + isoform_title_height)
                .attr('height', transcript_backbone_height)
                .attr("transform", "translate(" + x(featureChild.fmin) + ",0)")
                .attr('width', x(featureChild.fmax) - x(featureChild.fmin))
                .on("click", d => {
                  tooltipDiv.transition()
                    .duration(200)
                    .style("width", 'auto')
                    .style("height", 'auto')
                    .style("opacity", .9);
                  tooltipDiv.html(renderTrackDescription(featureChild))
                    .style("left", (d3.event.pageX+10) + "px")
                    .style("top", (d3.event.pageY +10) + "px")
                    .append('button')
                    .attr("type","button")
                    .text('Close')
                    .on('click', d => closeToolTip())
                })
                .datum({fmin: featureChild.fmin, fmax: featureChild.fmax});

              text_string = featureChild.name ;
              text_label = isoform.append('text')
                .attr('class', 'transcriptLabel')
                .attr('fill', selected ? 'sandybrown' : 'gray')
                .attr('opacity', selected ? 1 : 0.5)
                .attr('height', isoform_title_height)
                .attr("transform", "translate(" + x(featureChild.fmin) + ",0)")
                .text(text_string)
                .on("click", d => {
                  tooltipDiv.transition()
                    .duration(200)
                    .style("width", 'auto')
                    .style("height", 'auto')
                    .style("opacity", .9);
                  tooltipDiv.html(renderTrackDescription(featureChild))
                    .style("left", (d3.event.pageX+10) + "px")
                    .style("top", (d3.event.pageY +10) + "px")
                    .append('button')
                    .attr("type","button")
                    .text('Close')
                    .on('click', d => closeToolTip())
                })
                .datum({fmin: featureChild.fmin});

              //Now that the label has been created we can calculate the space that
              //this new element is taking up making sure to add in the width of
              //the box.
              // TODO: this is just an estimate of the length
              let text_width = text_string.length * 2;
              let feat_end;


              // not some instances (as in reactjs?) the bounding box isn't available, so we have to guess
              try {
                text_width = text_label.node().getBBox().width;
              } catch (e) {
                // console.error('Not yet rendered',e)
              }
              //First check to see if label goes past the end
              if (Number(text_width + x(featureChild.fmin)) > width) {
                // console.error(featureChild.name + " goes over the edge");
              }
              if (text_width > x(featureChild.fmax) - x(featureChild.fmin)) {
                feat_end = x(featureChild.fmin) + text_width;
              } else {
                feat_end = x(featureChild.fmax);
              }

              //This is probably not the most efficent way to do this.
              //Making an 2d array... each row is the first array (no zer0)
              //next level is each element taking up space.
              //Also using colons as spacers seems very perl... maybe change that?
              // *** DANGER EDGE CASE ***/
              if (used_space[current_row]) {
                let temp = used_space[current_row];
                temp.push(x(featureChild.fmin) + ":" + feat_end);
                used_space[current_row] = temp;
              } else {
                used_space[current_row] = [x(featureChild.fmin) + ":" + feat_end]
              }

              //Now check on bounds since this feature is displayed
              //The true end of display is converted to bp.
              if (fmin_display < 0 || fmin_display > featureChild.fmin) {
                fmin_display = featureChild.fmin;
              }
              if (fmax_display < 0 || fmax_display < featureChild.fmax) {
                fmax_display = featureChild.fmax;
              }

              // have to sort this so we draw the exons BEFORE the CDS
              featureChild.children = featureChild.children.sort(function (a, b) {

                let sortAValue = sortWeight[a.type];
                let sortBValue = sortWeight[b.type];

                if (typeof sortAValue === 'number' && typeof sortBValue === 'number') {
                  return sortAValue - sortBValue;
                }
                if (typeof sortAValue === 'number' && typeof sortBValue !== 'number') {
                  return -1;
                }
                if (typeof sortAValue !== 'number' && typeof sortBValue === 'number') {
                  return 1;
                }
                // NOTE: type not found and weighted
                return a.type - b.type;
              });

              featureChild.children.forEach(function (innerChild) {
                let innerType = innerChild.type;


                let validInnerType = false;
                if (exon_feats.indexOf(innerType) >= 0) {
                  validInnerType = true;
                  isoform.append('rect')
                    .attr('class', 'exon')
                    .attr('x', x(innerChild.fmin))
                    .attr('transform', 'translate(0,' + (exon_height - transcript_backbone_height) + ')')
                    .attr('height', exon_height)
                    .attr('z-index', 10)
                    .attr('width', x(innerChild.fmax) - x(innerChild.fmin))
                    .on("click", d => {
                      tooltipDiv.transition()
                        .duration(200)
                        .style("width", 'auto')
                        .style("height", 'auto')
                        .style("opacity", .9);
                      tooltipDiv.html(renderTrackDescription(featureChild))
                        .style("left", (d3.event.pageX+10) + "px")
                        .style("top", (d3.event.pageY +10) + "px")
                        .append('button')
                        .attr("type","button")
                        .text('Close')
                        .on('click', d => closeToolTip())
                    })
                    .datum({fmin: innerChild.fmin, fmax: innerChild.fmax});
                } else if (CDS_feats.indexOf(innerType) >= 0) {
                  validInnerType = true;
                  isoform.append('rect')
                    .attr('class', 'CDS')
                    .attr('x', x(innerChild.fmin))
                    .attr('transform', 'translate(0,' + (cds_height - transcript_backbone_height) + ')')
                    .attr('z-index', 20)
                    .attr('height', cds_height)
                    .attr('width', x(innerChild.fmax) - x(innerChild.fmin))
                    .on("click", d => {
                      tooltipDiv.transition()
                        .duration(200)
                        .style("width", 'auto')
                        .style("height", 'auto')
                        .style("opacity", .9);
                      tooltipDiv.html(renderTrackDescription(featureChild))
                        .style("left", (d3.event.pageX+10) + "px")
                        .style("top", (d3.event.pageY +10) + "px")
                        .append('button')
                        .attr("type","button")
                        .text('Close')
                        .on('click', d => closeToolTip())
                    })
                    .datum({fmin: innerChild.fmin, fmax: innerChild.fmax});
                } else if (UTR_feats.indexOf(innerType) >= 0) {
                  validInnerType = true;
                  isoform.append('rect')
                    .attr('class', 'UTR')
                    .attr('x', x(innerChild.fmin))
                    .attr('transform', 'translate(0,' + (utr_height - transcript_backbone_height) + ')')
                    .attr('z-index', 20)
                    .attr('height', utr_height)
                    .attr('width', x(innerChild.fmax) - x(innerChild.fmin))
                    .on("click", d => {
                      tooltipDiv.transition()
                        .duration(200)
                        .style("width", 'auto')
                        .style("height", 'auto')
                        .style("opacity", .9);
                      tooltipDiv.html(renderTrackDescription(featureChild))
                        .style("left", (d3.event.pageX+10) + "px")
                        .style("top", (d3.event.pageY +10) + "px")
                        .append('button')
                        .attr("type","button")
                        .text('Close')
                        .on('click', d => closeToolTip())
                    })
                    .datum({fmin: innerChild.fmin, fmax: innerChild.fmax});
                }
                if (validInnerType) {

                  let variantBins = [];
                  // create variant bins for overlap over a single isoform
                  // initially we do this for all of them, for both position and type
                  variantData.forEach(variant => {
                    let {type, fmax, fmin} = variant;
                    let adjustedFmin = x(fmin);
                    let adjustedFmax = x(fmax);
                    // we should ONLY ever find one or zero
                    let foundVariantBins = variantBins.filter( fb => {
                      const relativeMin = fb.fmin;
                      const relativeMax = fb.fmax;

                      // console.log(fb,adjustedFmin,adjustedFmax,type);
                      if(fb.type !== type) return false ;

                      // if we overlap thAe min edge then take the minimum and whatever the maximum and add
                      if(relativeMin <= adjustedFmin && relativeMax >= adjustedFmin){
                        return true ;
                      }
                      // if we overlap the max edge then take the maximum and whatever the maximum and add
                      if(relativeMax <= adjustedFmax && relativeMax >= adjustedFmax){
                        return true ;
                      }
                      // if both are within the edges then just add it
                      if(relativeMin >= adjustedFmin && relativeMax <= adjustedFmax){
                        return true ;
                      }

                      return false ;
                    });
                    if(foundVariantBins){
                      console.log('foundFvaiant bins',foundVariantBins,adjustedFmin,adjustedFmax)
                    }

                    if(foundVariantBins && foundVariantBins.length > 0 ){
                      // add variant to this bin and adust the min and max
                      let foundBin = foundVariantBins[0];
                      foundBin.variants.push(variant);
                      // console.log(foundBin.fmin,adjustedFmin,x(variant.fmin))
                      // console.log(foundBin.fmax,adjustedFmax,x(variant.fmax))
                      foundBin.fmin = Math.min(adjustedFmin,foundBin.fmin);
                      foundBin.fmax = Math.max(adjustedFmax,foundBin.fmax);
                      // console.log('final',JSON.stringify([foundBin.fmin,foundBin.fmax]))
                      foundVariantBins[0] = foundBin;
                    }
                    else{
                      const newBin = {
                        fmin: adjustedFmin,
                        fmax: adjustedFmax,
                        type,
                        variants: [variant]
                      };
                      variantBins.push( newBin);
                      // console.log('pushed! ',JSON.stringify(variantBins.length))
                    }
                    // console.log('pushing ',JSON.stringify(foundVariantBins[0]),'into ',JSON.stringify(variantBins));
                    // console.log('result',JSON.stringify(variantBins),variantBins.length);
                  });

                  // 12 if all have 1
                  console.log('variant bins, ',variantBins)

                  variantData.forEach(variant => {
                    let {type, fmax, fmin} = variant;
                    console.log('regular data, ',x(fmin),x(fmax),type)
                    if (
                      (fmin < innerChild.fmin && fmax > innerChild.fmin)
                      || (fmax > innerChild.fmax && fmin < innerChild.fmax)
                      || (fmax <= innerChild.fmax && fmin >= innerChild.fmin)
                    ) {
                      let drawnVariant = true;
                      const description = getVariantDescription(variant);
                      const consequence = description.consequence ? description.consequence : "UNKNOWN";
                      const consequenceColor = getColorForConsequence(consequence);
                      let descriptionHtml = renderVariantDescription(description);
                      // console.log('type type',type,`${variant.seqId}:${variant.fmin}..${variant.fmax}`,`${x(fmax)},${x(fmin)}`);
                      if (type.toLowerCase() === 'deletion' || type.toLowerCase() === 'mnv') {
                        isoform.append('rect')
                          .attr('class', 'variant-deletion')
                          .attr('x', x(fmin))
                          .attr('transform', 'translate(0,' + (variant_offset - transcript_backbone_height) + ')')
                          .attr('z-index', 30)
                          .attr('fill', consequenceColor)
                          .attr('height', variant_height)
                          .attr('width', Math.ceil(x(fmax)-x(fmin)))
                          .on("click", d => {
                            tooltipDiv.transition()
                              .duration(200)
                              .style("width", 'auto')
                              .style("height", 'auto')
                              .style("opacity", .9);
                            tooltipDiv.html(descriptionHtml)
                              .style("left", (d3.event.pageX+10) + "px")
                              .style("top", (d3.event.pageY +10) + "px")
                              .append('button')
                              .attr("type","button")
                              .text('Close')
                              .on('click', d => closeToolTip())
                            ;

                          })
                          .datum({fmin: fmin, fmax: fmax});
                      } else if (type.toLowerCase() === 'snv' || type.toLowerCase() === 'point_mutation') {
                        isoform.append('polygon')
                          .attr('class', 'variant-SNV')
                          .attr('points', snv_points(x(fmin)))
                          .attr('fill', consequenceColor)
                          .attr('x', x(fmin))
                          .attr('transform', 'translate(0,' + (variant_offset - transcript_backbone_height) + ')')
                          .attr('z-index', 30)
                          .on("click", d => {
                            tooltipDiv.transition()
                              .duration(200)
                              .style("width", 'auto')
                              .style("height", 'auto')
                              .style("opacity", .9);
                            tooltipDiv.html(descriptionHtml)
                              .style("left", (d3.event.pageX+10) + "px")
                              .style("top", (d3.event.pageY +10) + "px")
                              .append('button')
                              .attr("type","button")
                              .text('Close')
                              .on('click', d => closeToolTip())
                          })
                          .datum({fmin: fmin, fmax: fmax});
                      }
                      else if (type.toLowerCase() === 'insertion') {
                        isoform.append('polygon')
                          .attr('class', 'variant-insertion')
                          .attr('points', insertion_points(x(fmin)))
                          .attr('fill', consequenceColor)
                          .attr('x', x(fmin))
                          .attr('transform', 'translate(0,' + (variant_offset - transcript_backbone_height) + ')')
                          .attr('z-index', 30)
                          .on("click", d => {
                            tooltipDiv.transition()
                              .duration(200)
                              .style("width", 'auto')
                              .style("height", 'auto')
                              .style("opacity", .9);
                            tooltipDiv.html(descriptionHtml)
                              .style("left", (d3.event.pageX+10) + "px")
                              .style("top", (d3.event.pageY +10) + "px")
                              .append('button')
                              .attr("type","button")
                              .text('Close')
                              .on('click', d => closeToolTip())
                          })
                          .datum({fmin: fmin, fmax: fmax});
                      }
                      else if (type.toLowerCase() === 'delins'
                        || type.toLowerCase() === 'substitution'
                        || type.toLowerCase() === 'indel'
                      ) {
                        isoform.append('polygon')
                          .attr('class', 'variant-delins')
                          .attr('points', delins_points(x(fmin)))
                          .attr('x', x(fmin))
                          .attr('transform', 'translate(0,' + (variant_offset - transcript_backbone_height) + ')')
                          .attr('fill', consequenceColor)
                          .attr('z-index', 30)
                          .on("click", d => {
                            tooltipDiv.transition()
                              .duration(200)
                              .style("width", 'auto')
                              .style("height", 'auto')
                              .style("opacity", .9);
                            tooltipDiv.html(descriptionHtml)
                              .style("left", (d3.event.pageX+10) + "px")
                              .style("top", (d3.event.pageY +10) + "px")
                              .append('button')
                              .attr("type","button")
                              .text('Close')
                              .on('click', d => closeToolTip())
                          })
                          .datum({fmin: fmin, fmax: fmax});
                      }
                      else{
                        console.warn("type not found",type,variant);
                        drawnVariant = false ;
                      }
                      if(drawnVariant && showVariantLabel){
                        let symbol_string = getVariantSymbol(variant);
                        const symbol_string_length = symbol_string.length;
                        isoform.append('text')
                          .attr('class', 'variantLabel')
                          .attr('fill', selected ? 'sandybrown' : consequenceColor)
                          .attr('opacity', selected ? 1 : 0.5)
                          .attr('height', isoform_title_height)
                          .attr("transform", `translate(${x(fmin-(symbol_string_length/2.0*100))},${(variant_offset*2.2)- transcript_backbone_height})`)
                          .html(symbol_string)
                          .on("click", d => {
                            tooltipDiv.transition()
                              .duration(200)
                              .style("width", 'auto')
                              .style("height", 'auto')
                              .style("opacity", .9);
                            tooltipDiv.html(descriptionHtml)
                              .style("left", (d3.event.pageX+10) + "px")
                              .style("top", (d3.event.pageY +10) + "px")
                              .append('button')
                              .attr("type","button")
                              .text('Close')
                              .on('click', d => closeToolTip())
                            ;

                          })
                          .datum({fmin: featureChild.fmin});
                      }
                  }
                  });
                }
              });
              row_count += 1;

            }
            if (row_count === MAX_ROWS && !warningRendered) {
              // *** DANGER EDGE CASE ***/
              ++current_row;
              warningRendered = true ;
              // let isoform = track.append("g").attr("class", "isoform")
              //     .attr("transform", "translate(0," + ((row_count * isoform_height) + 10) + ")")
              track.append('a')
                .attr('class', 'transcriptLabel')
                .attr('xlink:show', 'new')
                .append('text')
                .attr('x', 10)
                .attr('y', 10)
                .attr("transform", "translate(0," + ((row_count * isoform_height) + 20 +heightBuffer) + ")")
                .attr('fill', 'red')
                .attr('opacity', 1)
                .attr('height', isoform_title_height)
                .text('Maximum features displayed.  See full view for more.');
            }
          }
        });
      }
    }


    if (row_count === 0) {
      track.append('text')
        .attr('x', 30)
        .attr('y', isoform_title_height + 10)
        .attr('fill', 'orange')
        .attr('opacity', 0.6)
        .text('Overview of non-coding genome features unavailable at this time.');
    }
    // we return the appropriate height function
    return (row_count * isoform_height) + heightBuffer;
  }

  async populateTrack(track,geneCallbackFunction,variantCallbackFunction) {
    await this.getTrackData(track,geneCallbackFunction);
    await this.getVariantData(track,variantCallbackFunction);
  }

  // await isoformTrack.getTrackData(track);
  // track_height += isoformTrack.DrawTrack();

  /* Method for isoformTrack service call */
  async getVariantData(track,callbackFunction) {
    this.variantData = await callbackFunction();
  }

  /* Method for isoformTrack service call */
  async getTrackData(track,callbackFunction) {
    this.trackData = await callbackFunction();
  }
}


export function getDescriptionDimensions(description){
  const descriptionHeight = Object.keys(description).length;
  const descriptionWidth = Object.entries(description)
    .sort( (a,b) => {
      return b[1].length - a[1].length;
    } )[0][1].length;
  return {descriptionWidth,descriptionHeight};
}

export function renderVariantDescription(description){
  let {descriptionHeight, descriptionWidth} = getDescriptionDimensions(description);
  let returnString = '';
  returnString += `<table class="tooltip-table"><tbody>`;
  returnString += `<tr><th>${description.symbol}</th><td>${description.location}</td></tr>`;
  returnString += `<tr><th>Type</th><td>${description.type}</td></tr>`;
  returnString += `<tr><th>Consequence</th><td>${description.consequence }</td></tr>`;
  if(description.name!==description.symbol){
    returnString += `<tr><th>Name</th><td>${description.name}</td></tr>`;
  }
  if(description.allele_of_genes){
    returnString += `<tr><th>Allele of Genes</th><td>${description.allele_of_genes.length>descriptionWidth ? description.allele_of_genes.substr(0,descriptionWidth) : description.allele_of_genes}</td></tr>`;
  }
  if(description.alleles){
    returnString += `<tr><th>Alleles</th><td>${description.alleles.length>descriptionWidth ? description.alleles.substr(0,descriptionWidth) : description.alleles}</td></tr>`;
  }
  if(description.alternative_alleles){
    returnString += `<tr><th>Alternative Alleles</th><td>${description.alternative_alleles.length>descriptionWidth ? description.alternative_alleles.substr(0,descriptionWidth) : description.alternative_alleles}</td></tr>`;
  }
  if(description.impact){
    returnString += `<tr><th>Impact</th><td>${description.impact.length>descriptionWidth ? description.impact.substr(0,descriptionWidth) : description.impact}</td></tr>`;
  }



  returnString += '</tbody></table>';
  return returnString;
}

/**
 * Returns an object
 * @param variant
 * @returns {object}
 */
export function getVariantDescription(variant){
  const variantSymbol = getVariantSymbol(variant);
  // let returnString = `${variantSymbol} ${variant.seqId}:${variant.fmin}..${variant.fmax}`;
  let returnObject = {} ;
  returnObject.symbol=variantSymbol ;
  returnObject.location = `${variant.seqId}:${variant.fmin}..${variant.fmax}`;

  let consequence = 'UNKNOWN';
  if(variant.geneLevelConsequence && variant.geneLevelConsequence.values && variant.geneLevelConsequence.values.length > 0){
    consequence = (Array.isArray(variant.geneLevelConsequence.values) ? variant.geneLevelConsequence.values.join(' ') : variant.geneLevelConsequence.values).replace(/"/g,"");
  }

  returnObject.consequence =  consequence;
  returnObject.type =  variant.type;
  returnObject.name =  variant.name;

  returnObject.description =  variant.description;

  if(variant.allele_of_genes && variant.allele_of_genes.values.length>0){
    returnObject.allele_of_genes =  (Array.isArray(variant.allele_of_genes.values) ? variant.allele_of_genes.values.join(' ') : variant.allele_of_genes.values).replace(/"/g,"");
  }
  if(variant.alleles && variant.alleles.values.length>0){
    returnObject.alleles =  (Array.isArray(variant.alleles.values) ? variant.alleles.values.join(' ') : variant.alleles.values).replace(/"/g,"");
  }
  if(variant.alternative_alleles && variant.alternative_alleles.values.length>0){
    returnObject.alternative_alleles =  (Array.isArray(variant.alternative_alleles.values) ? variant.alternative_alleles.values.join(' ') : variant.alternative_alleles.values).replace(/"/g,"")
  }
  if(variant.impact && variant.impact.values.length>0){
    returnObject.impact = (Array.isArray(variant.impact.values) ?  variant.impact.values.join(' '): variant.impact.values).replace(/"/g,"")
    // returnString += `impact: ${variant.impact.values}`;
  }

  return returnObject ;
}

export function getVariantSymbol(variant){
  let symbol = variant.name ;
  if(variant.symbol && variant.symbol.values.length>0){
    symbol = variant.symbol.values[0];
  }
  // return  (symbol.length>20 ? symbol.substr(0,20) : symbol).replace(/"/g,"");
  return symbol.replace(/"/g,"");
}

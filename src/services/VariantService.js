import {getColorForConsequence} from "./ConsequenceService";

export function getDescriptionDimensions(description){
  const descriptionHeight = Object.keys(description).length;
  const descriptionWidth = Object.entries(description)
    .sort( (a,b) => {
      return b[1].length - a[1].length;
    } )[0][1].length;
  return {descriptionWidth,descriptionHeight};
}

export function renderVariantDescriptions(descriptions){
  if(descriptions.length===1){
    return renderVariantDescription(descriptions[0]);
  }
  else
  if(descriptions.length>1){
    let stringBuffer = '<ul>';
    for(let d of descriptions){
      stringBuffer += `<li>${renderVariantDescription(d)}</li>`;
    }

    stringBuffer += '</ul>';
    return stringBuffer;

  }
  else{
    return 'No data available';
  }


  return returnString;
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

export function getVariantDescriptions(variant){
  return variant.variants.map( v => {
    let description = getVariantDescription(v)
    description.consequence = description.consequence ? description.consequence : 'UNKNOWN';
    return description;
  })
}

export function mergeConsequenceColors(colors){
  return 'hotpink';
  // return colors.map( d => {
  //   return getColorForConsequence(d.consequence);
  // })
}

export function getColorsForConsequences(descriptions){
  return descriptions.map( d => {
    return getColorForConsequence(d.consequence);
  })
}

export function getConsequence(variant){
  let consequence = 'UNKNOWN';
  if(variant.geneLevelConsequence && variant.geneLevelConsequence.values && variant.geneLevelConsequence.values.length > 0){
    consequence = (Array.isArray(variant.geneLevelConsequence.values) ? variant.geneLevelConsequence.values.join(' ') : variant.geneLevelConsequence.values).replace(/"/g,"");
  }
  return consequence;
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

  let consequence = getConsequence(variant);

  returnObject.consequence =  consequence;
  returnObject.type =  variant.type;
  returnObject.name =  variant.name;

  returnObject.description =  variant.description;

  if(variant.allele_of_genes){
    if(variant.allele_of_genes.values && variant.allele_of_genes.values.length>0){
      returnObject.allele_of_genes =  (Array.isArray(variant.allele_of_genes.values) ? variant.allele_of_genes.values.join(' ') : variant.allele_of_genes.values).replace(/"/g,"");
    }
    else{
      returnObject.allele_of_genes =  variant.allele_of_genes;
    }
  }
  if(variant.alleles){
    if(variant.alleles.values &&  variant.alleles.values.length>0){
      returnObject.alleles =  (Array.isArray(variant.alleles.values) ? variant.alleles.values.join(' ') : variant.alleles.values).replace(/"/g,"");
    }
    else{
      returnObject.alleles =  variant.alleles;
    }
  }
  if(variant.alternative_alleles){
    if(variant.alternative_alleles.values  && variant.alternative_alleles.values.length>0){
      returnObject.alternative_alleles =  (Array.isArray(variant.alternative_alleles.values) ? variant.alternative_alleles.values.join(' ') : variant.alternative_alleles.values).replace(/"/g,"")
    }
    else{
      returnObject.alternative_alleles =  variant.alternative_alleles;
    }
  }
  if(variant.impact){
    if(variant.impact.values   && variant.impact.values.length>0){
      returnObject.impact = (Array.isArray(variant.impact.values) ?  variant.impact.values.join(' '): variant.impact.values).replace(/"/g,"")
    }
    else{
      returnObject.impact = variant.impact;
    }
  }

  return returnObject ;
}

export function getVariantSymbol(variant){
  if(variant.variants){
    if(variant.variants.length!==1){
      return variant.variants.length;
    }
    else{
      return getVariantSymbol(variant.variants[0]);
    }
  }
  let symbol = variant.name ;
  if(variant.symbol && !variant.symbol.values){
    symbol = variant.symbol;
  }
  else
  if(variant.symbol && variant.symbol.values && variant.symbol.values.length>0){
    symbol = variant.symbol.values[0];
  }
  // return  (symbol.length>20 ? symbol.substr(0,20) : symbol).replace(/"/g,"");
  return symbol.replace(/"/g,"");
}
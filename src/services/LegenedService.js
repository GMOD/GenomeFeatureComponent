import {getColorForConsequence} from "./ConsequenceService";
import {generateDelinsPoint, generateInsertionPoint, generateSnvPoints} from "./VariantService";

function drawDeletion  (color,label) {
    return `<svg width="15" top="3" viewBox="0 -2 15 15" style="display: inline;" xmlns="http://www.w3.org/2000/svg"><rect fill="${color}" stroke="none" height="10" width="10"></svg>${label}</polygons></svg>`;
};

export function createLegendBox() {
    const isoformString = generateSnvPoints(0);
    console.log(isoformString)

    let returnString = `<table><tbody>`;
    returnString += `<tr>`;
    returnString += `<td align="center" valign="top"><u><b>Variant types</b></u></td>`;
    returnString += `<td align="center" valign="top" colspan="2"><u><b>Molecular Consequences</b></u></td>`;
    returnString += `</tr>`;
    returnString += `<tr>`;
    returnString += `<td valign="top" ><ul style="list-style-type:none;">`;
    returnString += `<li><svg width="15" top="3" viewBox="-7 -2 15 15" style="display: inline;" xmlns="http://www.w3.org/2000/svg"><polygon stroke="black" fill="black" points="${generateSnvPoints(0)}"></svg>point mutation / MNV </polygons></svg></li>`;
    returnString += `<li>${drawDeletion('black','deletion')}</li>`;
    returnString += `<li><svg width="15" top="3" viewBox="-7 -2 15 15" style="display: inline;" xmlns="http://www.w3.org/2000/svg"><polygon stroke="black" fill="black" points="${generateInsertionPoint(0)}"></svg>insertion</polygons></svg></li>`;
    returnString += `<li><svg width="15" top="3" viewBox="-7 -2 15 15" style="display: inline;" xmlns="http://www.w3.org/2000/svg"><polygon stroke="black" fill="black" points="${generateDelinsPoint(0)}"></svg>delins </polygons></svg></li>`;
    returnString += `</ul></td>`;
    returnString += `<td valign="top" ><ul style="list-style-type:none;">`;
    returnString += `<li>${drawDeletion('red','transcript ablation')}</li>`;
    returnString += `<li>${drawDeletion('orange','splice acceptor variant')}</li>`;
    returnString += `<li>${drawDeletion('orange','splice donor variant')}</li>`;
    returnString += `<li>${drawDeletion('red','stop gained')}</li>`;
    returnString += `<li>${drawDeletion('purple','frameshift variant')}</li>`;
    returnString += `<li>${drawDeletion('red','stop lost')}</li>`;
    returnString += `<li>${drawDeletion('yellow','start lost')}</li>`;
    returnString += `<li>${drawDeletion('lightpurple','inframe insertion')}</li>`;
    returnString += `<li>${drawDeletion('lightpurple','inframe deletion')}</li>`;
    returnString += `<li>${drawDeletion('yellow','missense variant')}</li>`;
    returnString += `<li>splice acceptor variant</li>`;
    returnString += `</ul></td>`;
    returnString += `<td valign="top" ><ul style="list-style-type:none;">`;
    returnString += `<li>${drawDeletion('red','protein altering variant')}</li>`;
    returnString += `<li>${drawDeletion('orange','splice region variant')}</li>`;
    returnString += `<li>${drawDeletion('green','start retained variant')}</li>`;
    returnString += `<li>${drawDeletion('green','stop retained variant')}</li>`;
    returnString += `<li>${drawDeletion('green','synonymous retained variant')}</li>`;
    returnString += `<li>${drawDeletion('darkgreen','coding sequence variant')}</li>`;
    returnString += `<li>${drawDeletion('lightblue','5 prime UTR variant')}</li>`;
    returnString += `<li>${drawDeletion('lightblue','3 prime UTR variant')}</li>`;
    returnString += `<li>${drawDeletion('darkblue','intron variant')}</li>`;
    returnString += `<li>${drawDeletion('green','non coding transcript variant')}</li>`;
    returnString += `</ul></td>`;
    returnString += `</tr>`;
    returnString += `<tr>`;
    returnString += `<td></td>`;
    returnString += `<td colspan="2"><a href="https://uswest.ensembl.org/info/genome/variation/prediction/predicted_data.html">Source: Ensembl</a></td>`;
    returnString += `</tr>`;

    returnString += `</tbody></table>`;


    return returnString;
}

import {getColorForConsequence} from "./ConsequenceService";
import {generateSnvPoints} from "./VariantService";

export function createLegendBox(){
    const isoformString = generateSnvPoints(0);
    console.log(isoformString)

    let returnString = `<table><tbody>`;
    returnString += `<tr>`;
    returnString += `<td>Variant types:</td>`;
    returnString += `<td colspan="2">Molecular Consequences:</td>`;
    returnString += `</tr>`;
    returnString += `<tr>`;
    returnString += `<td><ul style="list-style-type:none;">`;
    returnString += `<li><svg width="15" top="3" viewBox="-7 -2 15 15" style="display: inline;" xmlns="http://www.w3.org/2000/svg"><polygon stroke="black" fill="black" points="${isoformString}"></svg>point mutation / MNV </polygons></svg></li>`;
    returnString += `<li>deletion etc. </li>`;
    returnString += `<li>insertion etc. </li>`;
    returnString += `<li>delins etc. </li>`;
    returnString += `</ul></td>`;
    returnString += `<td><ul>`;
    returnString += `<li>transcript ablation </li>`;
    returnString += `<li>splice acceptor variant</li>`;
    returnString += `</ul></td>`;
    returnString += `<td><ul>`;
    returnString += `<li>protein altering variant</li>`;
    returnString += `<li>splice region variant </li>`;
    returnString += `</ul></td>`;

    returnString += `</tr>`;

    returnString += `</tbody></table>`;


    return returnString;
}

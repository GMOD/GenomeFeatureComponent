import {getColorForConsequence} from "./ConsequenceService";
import {generateDelinsPoint, generateInsertionPoint, generateSnvPoints} from "./VariantService";

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
    returnString += `<li><svg width="15" top="3" viewBox="-7 -2 15 15" style="display: inline;" xmlns="http://www.w3.org/2000/svg"><polygon stroke="black" fill="black" points="${generateSnvPoints(0)}"></svg>point mutation / MNV </polygons></svg></li>`;
    returnString += `<li><svg width="15" top="3" viewBox="0 -2 15 15" style="display: inline;" xmlns="http://www.w3.org/2000/svg"><rect stroke="black" fill="black" height="10" width="10"></svg>deletion</polygons></svg></li>`;
    returnString += `<li><svg width="15" top="3" viewBox="-7 -2 15 15" style="display: inline;" xmlns="http://www.w3.org/2000/svg"><polygon stroke="black" fill="black" points="${generateInsertionPoint(0)}"></svg>insertion</polygons></svg></li>`;
    returnString += `<li><svg width="15" top="3" viewBox="-7 -2 15 15" style="display: inline;" xmlns="http://www.w3.org/2000/svg"><polygon stroke="black" fill="black" points="${generateDelinsPoint(0)}"></svg>delins </polygons></svg></li>`;
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

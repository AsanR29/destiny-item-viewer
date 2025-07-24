function measureArea(element_id, denominator){
    let element = document.getElementById(element_id);
    let newRows = Math.ceil((Number.parseInt(element.offsetHeight)+320) / denominator) ;
    return newRows;
};

function repeatBG(bg_holder, element_id){
    let bg_div = document.getElementById(bg_holder);
    let bg_children = bg_div.querySelectorAll("svg");

    let bg_svg = bg_children.item(0);
    let bounds = bg_svg.getBBox();

    let increase = measureArea(element_id, bounds.height);
    for(let i = 0; i < increase; i++){
        bg_div.appendChild(bg_svg.cloneNode(true));
    }
    return;
};
function togglePasswordSection() {
    let input_element = document.getElementById("password_input");
    if(input_element.classList.contains("form_login_input")){ 
        input_element.classList.remove("form_login_input");
        input_element.classList.add("form_login_input_unavailable");
        input_element.value = "";
        input_element.readOnly = true;
    } else {
        input_element.classList.remove("form_login_input_unavailable");
        input_element.classList.add("form_login_input");
        input_element.readOnly = false;
    }
    return;
}

function ShowHover(element) {
    setTimeout(() => {
        if(element.matches(":hover")) {
            var target_id = "";
            if( element.id.includes("gun_") ) {
                target_id = "hover_" + element.id.substring(4);
            }
            // else ifs :?
            let hover_element = document.getElementById(target_id);
            console.log(element.offsetLeft);
            hover_element.style.left = element.offsetLeft+"px";
            hover_element.style.top = element.offsetTop+"px";
            hover_element.style.display = "block";

            setTimeout(()=> {
                if(!hover_element.matches(":hover")) {
                    HideHover(hover_element);
                }
            }, 500);
        }
    }, 200);
}

function HideHover(element) {
    element.style.display = "none";
}

function ShowLore() {
    document.getElementById("perk_tab").style.display = "none";
    document.getElementById("lore_tab").style.display = "block";
}
function ShowPerks() {
    document.getElementById("lore_tab").style.display = "none";
    document.getElementById("perk_tab").style.display = "block";
}
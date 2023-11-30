from typing import List, Dict, Any


def gen_output_format(input_params: List[Dict[str, Any]]):
    """Generate output format for the service based on input keys"""
    content = ""
    for param in input_params:
        key_name = param["name"]
        content += f"""[[{key_name} start]]
(If needed, output a value for {key_name} here. If not, leave it blank.)
[[{key_name} end]]\n
"""
    return content


def gen_input_schema_details(input_params: List[Dict[str, Any]]):
    """Generate input schema details for the service based on input keys"""
    content = "If choices for a parameter is specified, the input value must be one of the choices.\n"
    for param in input_params:
        key_name = param["name"]
        content += f"""
{key_name}:
    type: {param["type"]}
    description: {param["description"]}
    required: {param["required"]}
    """
        if param.get("choices"):
            content += f"   choices: {param['choices']}\n"

    return content


def update_dict(
    target: Dict[str, str],
    source: Dict[str, str],
):
    for key, value in source.items():
        if value is not None:
            if key not in target:
                target[key] = value
            else:
                target[key] += value
    return target

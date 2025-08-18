import re
import json

def parse_report(filepath):
    """
    Parses a Metrel-like report text file and extracts structured data.
    """
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"Error: The file '{filepath}' was not found.")
        return []

    blocks = content.strip().split('\n\n')
    if not blocks:
        return []

    header_block = blocks[0]
    location, date = None, None
    for line in header_block.split('\n'):
        if line.startswith("Test Location:"):
            location = line.split(":", 1)[1].strip()
        elif line.startswith("Date:"):
            date = line.split(":", 1)[1].strip()

    parsed_data = []
    for block in blocks[1:]:
        test_info = {"Test Location": location, "Date": date, "Test": None, "Circuit": None, "Result": None}
        for line in block.strip().split('\n'):
            if line.startswith("Test:"):
                test_info["Test"] = line.split(":", 1)[1].strip()
            elif line.startswith("Circuit:"):
                test_info["Circuit"] = line.split(":", 1)[1].strip()
            elif line.startswith("Result:"):
                test_info["Result"] = line.split(":", 1)[1].strip()
        if test_info["Test"]:
            parsed_data.append(test_info)
    return parsed_data

def generate_html_report(data):
    """
    Generates an HTML report from the parsed data.
    """
    if not data:
        return "<p>No data to generate report.</p>"

    location = data[0].get("Test Location", "N/A")
    date = data[0].get("Date", "N/A")

    # Basic styling for the report
    style = """
    <style>
        body { font-family: 'Tahoma', sans-serif; direction: rtl; margin: 20px; }
        h1, h2 { text-align: center; color: #333; }
        table { width: 80%; margin: 20px auto; border-collapse: collapse; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: right; }
        th { background-color: #f2f2f2; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .pass { color: #28a745; font-weight: bold; }
        .fail { color: #dc3545; font-weight: bold; }
    </style>
    """

    # Table header
    table_header = """
    <tr>
        <th>نوع آزمون</th>
        <th>شماره مدار</th>
        <th>نتیجه</th>
    </tr>
    """

    # Table rows
    table_rows = ""
    for item in data:
        result = item.get("Result", "").upper()
        result_class = "pass" if result == "PASS" else "fail"
        table_rows += f"""
        <tr>
            <td>{item.get("Test", "N/A")}</td>
            <td>{item.get("Circuit", "N/A")}</td>
            <td class="{result_class}">{result}</td>
        </tr>
        """

    # Full HTML document
    html = f"""
<!DOCTYPE html>
<html lang="fa">
<head>
    <meta charset="UTF-8">
    <title>گزارش بازرسی برق</title>
    {style}
</head>
<body>
    <h1>گزارش بازرسی برق</h1>
    <h2>محل: {location} | تاریخ: {date}</h2>
    <table>
        {table_header}
        {table_rows}
    </table>
</body>
</html>
    """
    return html

if __name__ == "__main__":
    report_file = "report.txt"
    output_html_file = "report.html"

    parsed_data = parse_report(report_file)

    if parsed_data:
        html_content = generate_html_report(parsed_data)
        try:
            with open(output_html_file, 'w', encoding='utf-8') as f:
                f.write(html_content)
            print(f"گزارش با موفقیت در فایل '{output_html_file}' ذخیره شد.")
        except IOError as e:
            print(f"Error writing to file {output_html_file}: {e}")
    else:
        print("No data was parsed, HTML report not generated.")

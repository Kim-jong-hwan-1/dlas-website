from flask import Flask, render_template, send_file
import sqlite3
import csv
import io

app = Flask(__name__, template_folder='templates')

def fetch_contacts():
    conn = sqlite3.connect('contactus.db')
    cursor = conn.cursor()
    cursor.execute('SELECT id, name, email, message, ip, country, created_at FROM contact_us ORDER BY created_at DESC')
    rows = cursor.fetchall()
    conn.close()
    return rows

@app.route('/admin/contacts')
def contacts():
    contacts = fetch_contacts()
    return render_template('contacts.html', contacts=contacts)

@app.route('/admin/contacts/download')
def download_contacts():
    contacts = fetch_contacts()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['ID', 'Name', 'Email', 'Message', 'IP', 'Country', 'Created At'])
    for contact in contacts:
        writer.writerow(contact)
    output.seek(0)
    return send_file(
        io.BytesIO(output.getvalue().encode('utf-8')),
        mimetype='text/csv',
        as_attachment=True,
        download_name='contact_list.csv'
    )

if __name__ == '__main__':
    app.run(port=8002, debug=True)
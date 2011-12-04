"""
Parses a file and prepares a slideshow out of it.
The format of the input file is as follows:

date(year or month eg. 09/2001 or 10000BC):
    - Title of the slide:
        description in textile
    - One more slide:
        slide content
etc.
"""

import re
import yaml
import textile
import tempita
import sys

input_files = sys.argv[1:]

def fromtextile(txt):
    return textile.textile(txt, 1, 'html', True)

def render(text):
    docs = text.split('---')
    meta = {}
    slides = {}
    render_slides = []
    t_file = open('template.html')
    template = tempita.Template(t_file.read())
    t_file.close()

    if len(docs) == 2:
        meta   = yaml.load(docs[0])
        slides = yaml.load(docs[1])
    elif len(docs) == 1:
        slides = yaml.load(docs[0])
    else:
        # Except
        raise ValueError('Document has more than two YAML documents')

    if (not meta.has_key('title')):
        meta['title'] = ''
    if (not meta.has_key('dir')):
        meta['dir'] = '.'

    for date in slides:
        for slide in slides[date]:
            for title in slide:
                render_slide = {
                    'title': str(title),
                    'date':  date,
                    'content': fromtextile(slide[title])
                }

            render_slides.append(render_slide)

    return template.substitute({'slides': render_slides, 'meta': meta})

for fn in input_files:
    i_f  = open(fn)

    try:
        o_fn = fn
        if fn.index('.') > 0:
            o_fn = '.'.join(fn.split('.')[0:-1])
    except:
        pass
    o_fn += '.html'
    o_f  = open(o_fn, 'w');
    print "Writing to: " + o_fn
    o_f.write(render(i_f.read()))

    i_f.close()
    o_f.close()


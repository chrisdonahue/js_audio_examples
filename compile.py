import fnmatch
import os
import shutil

from jinja2 import Environment, FileSystemLoader
import sass

# init directory path variables
PATH_DIRECTORY_OUTPUT = './compiled'
PATH_DIRECTORY_CORE = './core'
PATH_DIRECTORY_EXAMPLES = './examples'
PATH_TEMPLATE_EXAMPLE_BASE = './core/html/example/example.html.templ'
PATH_DIRECTORY_OUTPUT_CORE = PATH_DIRECTORY_OUTPUT + os.path.sep + PATH_DIRECTORY_CORE
PATH_DIRECTORY_OUTPUT_EXAMPLES = PATH_DIRECTORY_OUTPUT + os.path.sep + PATH_DIRECTORY_EXAMPLES
PATH_EXAMPLE_STATIC_URL = '../../core/'

def _match_files_recursive(path_dir, pattern):
	file_paths = []
	for root, dirnames, filenames in os.walk(path_dir):
		for filename in fnmatch.filter(filenames, pattern):
			file_paths.append(os.path.join(root, filename))
	return file_paths

# rm output directory if exists and create it
if os.path.exists(PATH_DIRECTORY_OUTPUT):
	shutil.rmtree(PATH_DIRECTORY_OUTPUT, True)
os.makedirs(PATH_DIRECTORY_OUTPUT)

# copy files to output folder
shutil.copytree(PATH_DIRECTORY_CORE, PATH_DIRECTORY_OUTPUT + os.path.sep + PATH_DIRECTORY_CORE)
shutil.copytree(PATH_DIRECTORY_EXAMPLES, PATH_DIRECTORY_OUTPUT + os.path.sep + PATH_DIRECTORY_EXAMPLES)

# HACK rm swap files for vim
paths_swap_files = _match_files_recursive(PATH_DIRECTORY_OUTPUT, '*.swp')
for path_swap_file in paths_swap_files:
	os.remove(path_swap_file)

# find and compile scss files
print '---- Compiling SASS Stylesheets ----'
scss_file_paths = _match_files_recursive(PATH_DIRECTORY_OUTPUT, '*.scss')
for scss_file_path in scss_file_paths:
	# open scss
	scss_file = open(scss_file_path, 'r')
	scss_file_contents = scss_file.read()
	scss_file.close()

	# delete sass file
	os.remove(scss_file_path)

	# compile to css
	try:
		css_file_contents = sass.compile_string(scss_file_contents)
	except Exception as e:
		print 'Error in SASS file {0}:\n{1}'.format(scss_file_path, str(e))
		continue

	# generate css file path
	scss_file_path_head, scss_file_path_tail = os.path.split(scss_file_path)
	scss_file_name = os.path.splitext(scss_file_path_tail)[0]
	css_file_path_tail = scss_file_name + '.css'
	css_file_path = os.path.join(scss_file_path_head, css_file_path_tail)

	# save css file
	css_file = open(css_file_path, 'w')
	css_file.write(css_file_contents)
	css_file.close()

print 'Done!'

# find and compile html templates
print '---- Compiling HTML Templates ----'
templates_file_paths = _match_files_recursive(PATH_DIRECTORY_OUTPUT, '*.html')
templates_dir_paths = list(set(map(lambda x: os.path.split(x)[0], templates_file_paths)))
template_dict = {}
for template_file_path in templates_file_paths:
	template_dict[os.path.split(template_file_path)[1]] = template_file_path

loader = FileSystemLoader(templates_dir_paths)
environment = Environment(loader=loader)
example_base = environment.get_template('example_base.html')

for template_name in environment.list_templates():
	if template_name == 'example_base.html' or not ('.html' in template_name):
		continue

	example = environment.get_template(template_name)
	example_rendered = example.render(static_url=PATH_EXAMPLE_STATIC_URL, example_base=example_base)
	
	with open(template_dict[template_name], 'w') as f:
		f.write(example_rendered)
		f.close()

print 'Done!'
